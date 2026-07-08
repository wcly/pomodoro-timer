# Changelog

All notable changes to this project will be documented in this file.

## [0.1.2] - 2026-07-08

### Added

- Persistent session history backed by SQLite, including session detail pages with per-app usage data.
- System notifications for focus, short break, and long break completion.

### Changed

- Short app usage durations now remain visible in session detail stats instead of disappearing after rounding.
- Added macOS install guidance for clearing Gatekeeper quarantine on unsigned builds.

### Fixed

- Restored timer completion notifications by requesting permission on start and using the packaged app notification path consistently.

## [0.1.1] - 2026-07-07

### Changed

- Updated all app icon assets with new design.
- Added Android and iOS icon sets for mobile support.
- Replaced launch icon (`tauri.svg` → `launch-icon.svg`).

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
