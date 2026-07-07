# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2026-07-07

Initial public release.

### Added

- Pomodoro timer desktop app built with Tauri 2, React 19, TypeScript, and Vite.
- Three timer modes: focus, short break, and long break.
- Timer controls for start, pause, reset, and mode switching.
- Daily stats view with completed focus count and total focus duration.
- Session detail view with time range, total duration, and per-app usage breakdown.
- Rust-backed session persistence and runtime commands for focus session lifecycle.
- macOS foreground app sampling that records the active application during focus sessions.

### Changed

- Simplified the codebase by removing unused dependencies, files, and abstraction layers.
- Consolidated frontend pages around timer, stats, and session detail flows.
- Hardened the Rust runtime and storage model used for session tracking.

### Known limitations

- Full foreground app tracking is currently implemented and verified only on macOS.
- The generated DMG package uses a plain layout because Finder AppleScript customization is not reliable in the current non-GUI build environment.
