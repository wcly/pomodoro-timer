# 番茄钟 SQLite 持久化设计

日期：2026-07-07

## 1. 目标

把当前番茄钟里的“已完成 session + usage 明细”从前端内存态改为本地 `SQLite` 持久化，满足以下目标：

- 应用重启后，历史记录、统计页、详情页都能恢复。
- 数据存储集中在 `Tauri/Rust`，前端不直接管理底层存储。
- 首版只覆盖“已完成记录”的持久化，不处理进行中的 session 恢复。
- 保持当前三页结构和统计逻辑，避免为了存储改造整套前端架构。

这次改动的重点是把真实数据源从 `React state` 挪到 `SQLite`，不是重做计时器，也不是重做前后台采样逻辑。

## 2. 已确认边界

### 2.1 要做

- 持久化所有已完成 session，包括：
  - `focus`
  - `shortBreak`
  - `longBreak`
- 持久化每条 session 对应的 usage 明细。
- 应用启动时从 `SQLite` 加载已有记录。
- session 完成时原子写入 `session + usage`。

### 2.2 不做

- 不恢复进行中的倒计时、暂停状态、采样缓存。
- 不新增同步、导出、云备份。
- 不增加设置页、数据库路径配置、手动迁移入口。
- 不引入 ORM、仓储层、通用存储抽象。

## 3. 方案选择

推荐方案：`Rust/Tauri` 独占 `SQLite`，前端只通过 commands 读写。

理由：

- `SQLite` 文件路径、schema、迁移都应由原生侧统一管理。
- 现有前端已经依赖 Tauri command；沿用这条边界，改动最少。
- 如果让前端直接碰 `SQLite`，边界会变脏，后续维护只会更差。

明确不采用：

- 前端直连 `SQLite`
- 退出时批量写库
- 为单一存储实现引入 ORM 或 repository pattern

## 4. 数据模型

`SQLite` 文件放在 Tauri app data 目录，固定文件名：

- `pomodoro.db`

只建两张表。

### 4.1 `sessions`

```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  mode TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL
);
```

说明：

- `id` 由前端生成 `crypto.randomUUID()`，避免历史回填后与本地递增编号冲突。
- `mode` 保存当前已有三种模式，避免把短休息和长休息又塞回临时态。

### 4.2 `session_usage`

```sql
CREATE TABLE session_usage (
  session_id TEXT NOT NULL,
  bundle_id TEXT NOT NULL,
  app_name TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);
```

说明：

- 不存 `percentage`。
- `percentage` 是派生值，读取时按 `duration_seconds / session.duration_seconds` 计算即可。
- 不需要给 `session_usage` 再造一个独立主键；当前访问模式只有“按 session 查 usage”。

## 5. Schema 初始化与迁移

首版不用迁移框架，直接使用 `PRAGMA user_version`。

规则：

- `user_version = 0`：创建 `sessions` 和 `session_usage`，然后设为 `1`
- `user_version = 1`：不做任何事
- 后续 schema 变化时，再补顺序迁移函数，例如 `1 -> 2`

理由：

- 现在只有两张表，上 Diesel/SeaORM 之类的东西纯属自找麻烦。
- `user_version` 足够覆盖当前规模，而且后续还能平滑升级。

## 6. Tauri 命令边界

保留现有运行态命令：

- `start_focus_session`
- `pause_focus_session`
- `resume_focus_session`
- `reset_focus_session`
- `capture_focus_sample`

说明：

- 这些名字带 `focus`，但当前实际已经服务于整个计时流程。
- 首版不为“命名洁癖”重命名，避免额外扩散修改面。

新增或改造的持久化命令：

- `load_session_details() -> SessionDetail[]`
- `finish_focus_session(session: SessionSummary) -> SessionDetail`

`finish_focus_session` 的处理顺序固定为：

1. 结束 runtime 中的活动 session
2. 聚合 usage
3. 开事务写入 `sessions` 和 `session_usage`
4. 返回完整 `SessionDetail`

这样可以保证：

- UI 只在真实落盘成功后显示历史记录
- 单次 session 不会出现“session 写成功但 usage 丢了”的半完成状态

## 7. 前端加载与写入流程

### 7.1 启动加载

`PomodoroApp` 首次挂载后调用一次 `loadSessionDetails()`。

返回结果直接填充现有的：

- `sessionDetailsById`

原因：

- 当前统计页、历史页、详情页的派生逻辑已经围绕 `sessionDetailsById` 工作。
- 复用它比引入新 store 或状态库更省事，也更稳。

前端额外增加两个轻量状态：

- `isLoading`
- `loadError`

要求：

- 加载未完成前，不显示“0 条记录”的假空态。
- 加载失败时显示阻断态和重试按钮。

### 7.2 完成写入

开始 session 时：

- `handleStart()` 生成 `crypto.randomUUID()` 作为 session id

倒计时完成时：

1. 前端先组完整 `session`
2. 调用 `finishFocusSession(session)`
3. 只有命令成功返回后，才把返回的 `SessionDetail` 合并进 `sessionDetailsById`

不采用乐观插入。

理由：

- 本地 `SQLite` 写入很快，没有必要为了极小收益引入“UI 成功但没落盘”的脏状态。

### 7.3 失败处理

- `loadSessionDetails()` 失败：显示“记录加载失败”，允许重试
- `finishFocusSession()` 失败：不把这条 session 塞进历史记录，显示“保存失败”
- `start/pause/resume/reset/capture` 保持当前轻量容错，不扩大这次范围

## 8. Rust 持久化实现

新增一个很薄的 `storage.rs`，只负责数据库读写，不做额外抽象。

建议提供三个函数：

- `init_database(db_path)`
- `load_session_details(db_path) -> Vec<SessionDetail>`
- `save_session_detail(db_path, session, usage)`

### 8.1 连接策略

`AppState` 不长期持有 `SQLite connection`。

采用：

- 启动时解析 app data 路径
- 确保目录存在
- 运行一次 `init_database`
- `AppState` 只保存 `db_path`
- 每次读写临时 `Connection::open(&db_path)`

理由：

- 这个应用的数据库访问频率很低。
- 临时开连接的代码反而更短，也少掉线程安全、连接生命周期和锁管理问题。

### 8.2 查询策略

`load_session_details`：

- 先按 `started_at DESC` 读取 `sessions`
- 再按 `session_id` 读取各自 usage
- 组装为前端现有的 `SessionDetail[]`

`save_session_detail`：

- 用单个事务写入 `sessions`
- 再写入对应 `session_usage`

### 8.3 错误模型

`AppError` 增加数据库错误分支，例如：

- `Database(String)`

不要把裸 `rusqlite::Error` 直接透给前端。

## 9. 测试范围

### 9.1 Rust

最小必须覆盖：

- 空库初始化后能建表并把 `user_version` 设为 `1`
- `save_session_detail + load_session_details` round-trip 正确
- `load_session_details` 返回顺序为 `started_at DESC`
- usage 的 `percentage` 读取时计算正确

不测：

- `SQLite` 自身实现
- 每条 SQL 的逐句单测

### 9.2 前端

最小必须覆盖：

- 挂载时调用 `loadSessionDetails`，成功后渲染历史记录
- `loadSessionDetails` 失败时显示加载失败态
- session 完成后只有在 `finishFocusSession` 成功返回时才进入历史记录
- session id 改为 `crypto.randomUUID()` 后，不影响现有统计与详情跳转

测试策略保持现有风格：

- 先写失败测试，再补实现
- 不为这次改动引入新的前端状态管理测试框架

## 10. 风险与控制

### 10.1 历史编号冲突

风险：

- 继续用 `session-1`、`session-2` 这类本地递增 id，启动时加载历史后容易撞号

控制：

- 改成 `crypto.randomUUID()`

### 10.2 部分写入

风险：

- `sessions` 与 `session_usage` 分开写，容易出现半成功状态

控制：

- `save_session_detail` 必须走单事务

### 10.3 启动空闪

风险：

- 异步加载前如果直接渲染空列表，UI 会先显示“没有记录”，再突然跳出历史

控制：

- 增加 `isLoading`，首次加载完成前不渲染空态

## 11. 不在本次实现内

- 进行中 session 恢复
- 数据导出
- 数据删除
- 设置自定义数据库位置
- 对已有内存态记录做一次性迁移脚本

这些都不是当前需求。先把本地 `SQLite` 持久化做对，再谈别的。
