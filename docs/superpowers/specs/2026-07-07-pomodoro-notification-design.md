# 番茄钟完成通知设计

日期：2026-07-07

## 1. 目标

为当前番茄钟增加“计时完成后发送系统通知”的能力，满足以下目标：

- 三种模式计时结束时都发送通知：
  - `focus`
  - `shortBreak`
  - `longBreak`
- 无论应用在前台还是后台，都尝试发送系统通知。
- 保持当前计时、持久化、统计逻辑不变，只在完成时增加通知行为。
- 首版不引入 Rust 原生通知层、不增加设置页、不增加声音。

这次改动的重点是“计时归零时提醒用户”，不是重做计时器，也不是做一套通知偏好系统。

## 2. 已确认边界

### 2.1 要做

- 倒计时归零时发送系统通知。
- `focus`、`shortBreak`、`longBreak` 三种模式都通知。
- 应用在前台和后台都走同一套通知逻辑。
- 权限允许时发送；权限拒绝或环境不支持时静默跳过。

### 2.2 不做

- 不增加通知开关、免打扰、仅后台通知等设置。
- 不增加提示音、震动、角标、通知历史。
- 不改 `Rust/Tauri` command 边界。
- 不为通知引入新依赖、新插件或原生模块。
- 不因为通知失败打断 session 保存或页面更新。

## 3. 方案选择

推荐方案：前端直接使用系统 `Notification` API，并在番茄钟 feature 内包一层很薄的通知封装。

理由：

- 当前计时完成事件已经在前端 `PomodoroApp -> usePomodoroTimer(..., { onFinished })` 上收口。
- 只需要在唯一完成出口增加一个副作用，不值得为此下沉到 Rust。
- 用浏览器原生 `Notification` API 的改动面最小，测试成本也最低。

明确不采用：

- Tauri 原生通知插件或自定义 Rust command
- 只做应用内弹层/提示条
- 为单一通知行为引入通用通知服务框架

## 4. 结构与文件改动

只改这 4 个位置：

- 新增 `src/features/pomodoro/notification.ts`
- 修改 `src/features/pomodoro/PomodoroApp.tsx`
- 新增 `src/features/pomodoro/__tests__/notification.test.ts`
- 修改 `src/features/pomodoro/__tests__/PomodoroApp.test.tsx`

不改：

- `src-tauri/` 下任何 Rust 文件
- `usePomodoroTimer.ts`
- `TimerPage.tsx` 或其他 UI 结构
- `package.json` 依赖

理由：

- 通知是完成时的副作用，不是计时核心状态。
- 把浏览器 API 细节收进单文件封装，比把权限和文案逻辑塞进 `PomodoroApp` 更干净。
- 这类需求最容易被人顺手做成“可配置通知中心”；这次明确不允许。

## 5. 通知行为设计

### 5.1 触发时机

通知调用放在 `PomodoroApp` 里 `usePomodoroTimer` 的 `onFinished()` 回调中。

调用时机要求：

- 在倒计时归零的那个完成回调里立即触发。
- 不等待 `finishFocusSession()` 保存成功后再通知。

原因：

- 通知描述的是“计时结束”，不是“落库成功”。
- 如果把通知和保存绑死，持久化失败就会把提醒一起吞掉，这是错误耦合。

### 5.2 文案

首版使用固定文案映射：

- `focus`
  - 标题：`专注结束`
  - 正文：`该休息了。`
- `shortBreak`
  - 标题：`短休息结束`
  - 正文：`可以继续专注了。`
- `longBreak`
  - 标题：`长休息结束`
  - 正文：`可以开始下一轮了。`

首版不做动态自定义文案。

### 5.3 权限与降级

`notification.ts` 导出一个很薄的异步函数，例如：

- `notifyTimerFinished(mode: TimerMode): Promise<void>`

逻辑顺序固定为：

1. 检查运行环境里是否存在 `globalThis.Notification`
2. 如果不存在，直接返回
3. 如果 `Notification.permission === "granted"`，直接发送
4. 如果 `Notification.permission === "default"`，调用 `Notification.requestPermission()`
5. 只有最终权限为 `granted` 时才真正发送
6. 权限为 `denied` 或请求失败时，静默返回

错误处理要求：

- 任何通知相关异常都在封装内吞掉
- 不把通知失败透传给 `PomodoroApp`
- 不额外渲染错误提示

## 6. 前端数据流

完成路径保持现有结构，只增加一条通知副作用：

1. `usePomodoroTimer` 归零
2. 进入 `PomodoroApp` 的 `onFinished()`
3. 读取 `currentModeRef.current`
4. 调用 `notifyTimerFinished(currentModeRef.current)`
5. 原有 session 保存逻辑继续执行
6. 原有 `sessionDetailsById` 更新逻辑继续执行

关键要求：

- 通知调用与 session 保存相互独立
- 三种模式共用一个通知入口
- 每次完成最多触发一次通知

不把通知逻辑放进 `usePomodoroTimer.ts` 的原因：

- hook 负责计时状态，不该知道系统通知文案和权限细节
- 现有完成事件已经以回调形式暴露，继续沿用就够了

## 7. 测试范围

### 7.1 `notification.test.ts`

最小必须覆盖：

- `Notification.permission === "granted"` 时发送一次通知
- `Notification.permission === "default"` 且请求后返回 `granted` 时发送一次通知
- `Notification.permission === "denied"` 时不发送通知
- 环境里没有 `Notification` 时静默返回
- 通知构造或权限请求抛错时静默返回

不测：

- 操作系统是否真的弹窗
- 平台通知样式

### 7.2 `PomodoroApp.test.tsx`

最小必须覆盖：

- `focus` 完成时触发“专注结束”通知
- `shortBreak` 完成时触发“短休息结束”通知
- `longBreak` 完成时触发“长休息结束”通知
- 单次倒计时完成只通知一次

测试方式：

- 使用现有 fake timers 跑完倒计时
- mock 通知封装或 `Notification`
- 断言调用次数和文案

## 8. 风险与处理

已知风险只有这几个：

- 某些运行环境没有 `Notification`
- 权限被用户拒绝
- 权限请求或通知构造抛出异常

处理方式统一为静默降级。

原因：

- 这是提醒功能，不是数据正确性的关键路径。
- 为通知失败增加 UI 错误态只会制造更多噪音。

## 9. 验收标准

满足以下条件即可算首版完成：

- 三种模式倒计时结束都尝试发送系统通知
- 前台和后台都不额外分支处理
- 通知失败不会影响计时完成后的保存与统计
- 无新增依赖、无 Rust 改动、无设置页
- 前端测试覆盖通知封装和完成时触发行为
