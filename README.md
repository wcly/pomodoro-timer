# Pomodoro Timer

一个基于 `Tauri 2 + React 19 + TypeScript + Vite` 的桌面番茄钟项目。

## 功能

- 番茄钟倒计时，支持 `专注`、`短休息`、`长休息` 三种模式
- 支持 `开始`、`暂停`、`重置`
- 显示今日完成的番茄数量
- 统计页可查看今日专注时长和历史 session
- 详情页可查看单次 session 的时间范围、总时长、应用使用占比
- 在 Tauri 桌面运行时，会按秒采样当前前台应用并生成使用明细

## 运行

环境要求：

- `Node.js >= 20`
- `Rust`
- 本机具备 `Tauri 2` 开发环境

安装依赖：

```bash
pnpm install
```

只启动前端页面：

```bash
pnpm dev
```

这个模式适合调界面，但不会启用原生前台应用采样。

启动 Tauri 桌面应用：

```bash
pnpm tauri dev
```

如果要打包：

```bash
pnpm tauri build
```

## 调试

前端调试：

```bash
pnpm dev
```

测试：

```bash
pnpm test
```

监听模式跑测试：

```bash
pnpm test:watch
```

完整联调：

```bash
pnpm tauri dev
```

这个模式下可以一起看前端和 Rust 侧输出，也是验证前台应用追踪是否正常的唯一可靠方式。

## 安装

从 [Releases](https://github.com/wlcy/pomodoro-timer/releases) 下载 `.dmg`，双击挂载后拖入 `Applications`。

macOS 会提示"已损坏，无法打开"，因为 app 未签名。终端运行一行即可：

```bash
xattr -cr /Applications/番茄工作钟.app
```

然后就能正常打开了。这是 macOS Gatekeeper 对未签名 app 的标准行为，不是文件真的损坏。

## 支持的操作系统

- 完整功能目前只支持 `macOS`
- 原因是当前前台应用追踪实现依赖 macOS 原生接口
- `Windows` 和 `Linux` 没有做完整适配，也没有验证
- 即使其它系统能跑起界面，也无法正常提供前台应用追踪能力
