# Pomodoro SQLite Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist completed Pomodoro sessions and per-session app usage in a local SQLite database managed by Tauri, then hydrate the React UI from that stored history on startup.

**Architecture:** Rust owns the database file, schema, reads, and writes. React keeps its current derived-state UI flow, but it stops treating local component state as the source of truth and instead bootstraps from `load_session_details()` and only appends records after `finish_focus_session()` saves successfully.

**Tech Stack:** React 19, TypeScript, Vitest, Tauri 2, Rust, rusqlite, chrono, SQLite

---

## File Structure

### Rust / Tauri

- Modify: `/Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/Cargo.toml`
  - Add the SQLite dependency used by the native persistence layer.
- Modify: `/Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/src/lib.rs`
  - Register the storage module, initialize the database at startup, and store the DB path in app state.
- Modify: `/Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/src/commands.rs`
  - Add `load_session_details` and change `finish_focus_session` to persist a full session record.
- Modify: `/Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/src/error.rs`
  - Add a database error variant/helper so storage failures serialize cleanly to the frontend.
- Modify: `/Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/src/models.rs`
  - Define the session and detail payloads returned to the frontend.
- Modify: `/Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/src/stats.rs`
  - Return usage rows without `session_id`; persistence will attach the parent session through the command layer.
- Create: `/Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/src/storage.rs`
  - Initialize schema, migrate `user_version`, save a session transactionally, load details, and host storage unit tests.

### Frontend

- Modify: `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/focusSessionApi.ts`
  - Add a load helper and change finish to send a full `SessionSummary` and receive a persisted `SessionDetail`.
- Modify: `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/PomodoroApp.tsx`
  - Bootstrap saved history, add loading/error states, swap incrementing IDs for `crypto.randomUUID()`, and only add completed sessions after persistence succeeds.
- Modify: `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/__tests__/PomodoroApp.test.tsx`
  - Update existing timer/stat assertions for async bootstrap and persisted completion.
- Modify: `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/__tests__/PomodoroApp.focusTracking.test.tsx`
  - Mock the new persistence APIs and cover load failure, retry, and save failure behavior.
- Create: `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/__tests__/focusSessionApi.test.ts`
  - Lock down the frontend-to-Tauri command contract.

## Task 1: Build The SQLite Storage Layer

**Files:**
- Modify: `/Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/Cargo.toml`
- Modify: `/Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/src/models.rs`
- Modify: `/Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/src/stats.rs`
- Create: `/Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/src/storage.rs`

- [ ] **Step 1: Write the failing storage tests**

Create `/Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/src/storage.rs` with temporary stubs and these tests first:

```rust
use std::path::{Path, PathBuf};

use crate::error::AppError;
use crate::models::{SessionDetail, SessionSummary, SessionUsageRow};

pub fn init_database(_db_path: &Path) -> Result<(), AppError> {
    todo!("implemented in step 3")
}

pub fn load_session_details(_db_path: &Path) -> Result<Vec<SessionDetail>, AppError> {
    todo!("implemented in step 3")
}

pub fn save_session_detail(
    _db_path: &Path,
    _session: &SessionSummary,
    _usage: &[SessionUsageRow],
) -> Result<(), AppError> {
    todo!("implemented in step 3")
}

#[cfg(test)]
mod tests {
    use super::{init_database, load_session_details, save_session_detail};
    use crate::models::{SessionSummary, SessionUsageRow};
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_db_path(label: &str) -> std::path::PathBuf {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        std::env::temp_dir().join(format!("pomodoro-{label}-{nanos}.db"))
    }

    #[test]
    fn initializes_schema_and_round_trips_session_details() {
        let db_path = temp_db_path("roundtrip");
        let session = SessionSummary {
            id: "session-1".into(),
            mode: "focus".into(),
            started_at: "2026-07-07T09:00:00.000Z".into(),
            ended_at: "2026-07-07T09:25:00.000Z".into(),
            duration_seconds: 1500,
        };
        let usage = vec![
            SessionUsageRow {
                bundle_id: "com.microsoft.VSCode".into(),
                app_name: "VS Code".into(),
                duration_seconds: 900,
                percentage: 0.0,
            },
            SessionUsageRow {
                bundle_id: "com.google.Chrome".into(),
                app_name: "Chrome".into(),
                duration_seconds: 600,
                percentage: 0.0,
            },
        ];

        init_database(&db_path).unwrap();
        save_session_detail(&db_path, &session, &usage).unwrap();

        let loaded = load_session_details(&db_path).unwrap();

        assert_eq!(loaded.len(), 1);
        assert_eq!(loaded[0].session.id, "session-1");
        assert_eq!(loaded[0].usage.len(), 2);
        assert_eq!(loaded[0].usage[0].app_name, "VS Code");
        assert!((loaded[0].usage[0].percentage - 0.6).abs() < f64::EPSILON);
    }

    #[test]
    fn loads_sessions_in_descending_started_at_order() {
        let db_path = temp_db_path("ordering");

        init_database(&db_path).unwrap();
        save_session_detail(
            &db_path,
            &SessionSummary {
                id: "older".into(),
                mode: "focus".into(),
                started_at: "2026-07-07T08:00:00.000Z".into(),
                ended_at: "2026-07-07T08:25:00.000Z".into(),
                duration_seconds: 1500,
            },
            &[],
        )
        .unwrap();
        save_session_detail(
            &db_path,
            &SessionSummary {
                id: "newer".into(),
                mode: "shortBreak".into(),
                started_at: "2026-07-07T09:00:00.000Z".into(),
                ended_at: "2026-07-07T09:05:00.000Z".into(),
                duration_seconds: 300,
            },
            &[],
        )
        .unwrap();

        let loaded = load_session_details(&db_path).unwrap();

        assert_eq!(loaded.iter().map(|detail| detail.session.id.as_str()).collect::<Vec<_>>(), vec!["newer", "older"]);
    }
}
```

- [ ] **Step 2: Run the targeted Rust tests and verify they fail**

Run:

```bash
cargo test --manifest-path /Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/Cargo.toml storage::tests::initializes_schema_and_round_trips_session_details
```

Expected: FAIL with a `not yet implemented` panic from `init_database` or `save_session_detail`.

- [ ] **Step 3: Write the minimal SQLite implementation**

Update `/Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/Cargo.toml`:

```toml
[dependencies]
rusqlite = { version = "0.32", features = ["bundled"] }
tauri = { version = "2", features = [] }
tauri-plugin-opener = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
chrono = { version = "0.4", features = ["serde"] }
thiserror = "2"
```

Update `/Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/src/models.rs`:

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionSummary {
    pub id: String,
    pub mode: String,
    pub started_at: String,
    pub ended_at: String,
    pub duration_seconds: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionUsageRow {
    pub bundle_id: String,
    pub app_name: String,
    pub duration_seconds: i64,
    pub percentage: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionDetail {
    pub session: SessionSummary,
    pub usage: Vec<SessionUsageRow>,
}
```

Update `/Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/src/stats.rs` so `aggregate_samples` returns `Vec<SessionUsageRow>`:

```rust
use std::collections::HashMap;

use crate::models::{ForegroundSample, SessionUsageRow};

pub fn aggregate_samples(
    session_duration_seconds: i64,
    samples: &[ForegroundSample],
) -> Vec<SessionUsageRow> {
    let percentage_denominator = if session_duration_seconds > 0 {
        session_duration_seconds as f64
    } else {
        0.0
    };
    let mut seconds_by_bundle: HashMap<(String, String), i64> = HashMap::new();

    for sample in samples {
        let key = (sample.bundle_id.clone(), sample.app_name.clone());
        *seconds_by_bundle.entry(key).or_insert(0) += 1;
    }

    let mut rows: Vec<SessionUsageRow> = seconds_by_bundle
        .into_iter()
        .map(|((bundle_id, app_name), duration_seconds)| SessionUsageRow {
            bundle_id,
            app_name,
            duration_seconds,
            percentage: if percentage_denominator > 0.0 {
                duration_seconds as f64 / percentage_denominator
            } else {
                0.0
            },
        })
        .collect();

    rows.sort_by(|left, right| {
        right
            .duration_seconds
            .cmp(&left.duration_seconds)
            .then_with(|| left.bundle_id.cmp(&right.bundle_id))
            .then_with(|| left.app_name.cmp(&right.app_name))
    });
    rows
}
```

Replace `/Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/src/storage.rs` stubs with:

```rust
use std::path::Path;

use rusqlite::{params, Connection};

use crate::error::AppError;
use crate::models::{SessionDetail, SessionSummary, SessionUsageRow};

pub fn init_database(db_path: &Path) -> Result<(), AppError> {
    let connection = Connection::open(db_path).map_err(AppError::database)?;
    let version: i64 = connection
        .pragma_query_value(None, "user_version", |row| row.get(0))
        .map_err(AppError::database)?;

    if version == 0 {
        connection
            .execute_batch(
                "
                CREATE TABLE sessions (
                  id TEXT PRIMARY KEY,
                  mode TEXT NOT NULL,
                  started_at TEXT NOT NULL,
                  ended_at TEXT NOT NULL,
                  duration_seconds INTEGER NOT NULL
                );
                CREATE TABLE session_usage (
                  session_id TEXT NOT NULL,
                  bundle_id TEXT NOT NULL,
                  app_name TEXT NOT NULL,
                  duration_seconds INTEGER NOT NULL,
                  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
                );
                PRAGMA user_version = 1;
                ",
            )
            .map_err(AppError::database)?;
    }

    Ok(())
}

pub fn save_session_detail(
    db_path: &Path,
    session: &SessionSummary,
    usage: &[SessionUsageRow],
) -> Result<(), AppError> {
    let mut connection = Connection::open(db_path).map_err(AppError::database)?;
    let transaction = connection.transaction().map_err(AppError::database)?;

    transaction
        .execute(
            "INSERT INTO sessions (id, mode, started_at, ended_at, duration_seconds) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![
                session.id,
                session.mode,
                session.started_at,
                session.ended_at,
                session.duration_seconds
            ],
        )
        .map_err(AppError::database)?;

    for row in usage {
        transaction
            .execute(
                "INSERT INTO session_usage (session_id, bundle_id, app_name, duration_seconds) VALUES (?1, ?2, ?3, ?4)",
                params![session.id, row.bundle_id, row.app_name, row.duration_seconds],
            )
            .map_err(AppError::database)?;
    }

    transaction.commit().map_err(AppError::database)?;
    Ok(())
}

pub fn load_session_details(db_path: &Path) -> Result<Vec<SessionDetail>, AppError> {
    let connection = Connection::open(db_path).map_err(AppError::database)?;
    let mut session_statement = connection
        .prepare(
            "SELECT id, mode, started_at, ended_at, duration_seconds
             FROM sessions
             ORDER BY started_at DESC",
        )
        .map_err(AppError::database)?;

    let sessions = session_statement
        .query_map([], |row| {
            Ok(SessionSummary {
                id: row.get(0)?,
                mode: row.get(1)?,
                started_at: row.get(2)?,
                ended_at: row.get(3)?,
                duration_seconds: row.get(4)?,
            })
        })
        .map_err(AppError::database)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(AppError::database)?;

    let mut usage_statement = connection
        .prepare(
            "SELECT bundle_id, app_name, duration_seconds
             FROM session_usage
             WHERE session_id = ?1
             ORDER BY duration_seconds DESC, bundle_id ASC, app_name ASC",
        )
        .map_err(AppError::database)?;

    let mut details = Vec::with_capacity(sessions.len());
    for session in sessions {
        let usage = usage_statement
            .query_map([session.id.as_str()], |row| {
                let duration_seconds: i64 = row.get(2)?;
                Ok(SessionUsageRow {
                    bundle_id: row.get(0)?,
                    app_name: row.get(1)?,
                    duration_seconds,
                    percentage: if session.duration_seconds > 0 {
                        duration_seconds as f64 / session.duration_seconds as f64
                    } else {
                        0.0
                    },
                })
            })
            .map_err(AppError::database)?
            .collect::<Result<Vec<_>, _>>()
            .map_err(AppError::database)?;

        details.push(SessionDetail { session, usage });
    }

    Ok(details)
}
```

- [ ] **Step 4: Run the targeted Rust tests and verify they pass**

Run:

```bash
cargo test --manifest-path /Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/Cargo.toml storage::tests::initializes_schema_and_round_trips_session_details
cargo test --manifest-path /Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/Cargo.toml storage::tests::loads_sessions_in_descending_started_at_order
```

Expected: both tests PASS.

- [ ] **Step 5: Commit**

```bash
git add /Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/Cargo.toml /Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/src/models.rs /Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/src/stats.rs /Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/src/storage.rs
git commit -m "feat: add sqlite storage for pomodoro history"
```

## Task 2: Wire Tauri Commands And The Frontend API Contract

**Files:**
- Modify: `/Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/src/lib.rs`
- Modify: `/Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/src/commands.rs`
- Modify: `/Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/src/error.rs`
- Modify: `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/focusSessionApi.ts`
- Create: `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/__tests__/focusSessionApi.test.ts`

- [ ] **Step 1: Write the failing frontend API contract tests**

Create `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/__tests__/focusSessionApi.test.ts`:

```ts
import { invoke } from "@tauri-apps/api/core";
import { finishFocusSession, loadSessionDetails } from "../focusSessionApi";
import type { SessionDetail, SessionSummary } from "../types";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const invokeMock = vi.mocked(invoke);

beforeEach(() => {
  invokeMock.mockReset();
});

test("loadSessionDetails invokes the tauri loader command", async () => {
  const detail: SessionDetail = {
    session: {
      id: "session-1",
      mode: "focus",
      startedAt: "2026-07-07T09:00:00.000Z",
      endedAt: "2026-07-07T09:25:00.000Z",
      durationSeconds: 1500,
    },
    usage: [],
  };

  invokeMock.mockResolvedValueOnce([detail]);

  await expect(loadSessionDetails()).resolves.toEqual([detail]);
  expect(invokeMock).toHaveBeenCalledWith("load_session_details", undefined);
});

test("finishFocusSession sends the whole session payload and returns the saved detail", async () => {
  const session: SessionSummary = {
    id: "session-1",
    mode: "focus",
    startedAt: "2026-07-07T09:00:00.000Z",
    endedAt: "2026-07-07T09:25:00.000Z",
    durationSeconds: 1500,
  };
  const detail: SessionDetail = {
    session,
    usage: [],
  };

  invokeMock.mockResolvedValueOnce(detail);

  await expect(finishFocusSession(session)).resolves.toEqual(detail);
  expect(invokeMock).toHaveBeenCalledWith("finish_focus_session", { session });
});
```

- [ ] **Step 2: Run the API contract tests and verify they fail**

Run:

```bash
npm test -- focusSessionApi.test.ts
```

Expected: FAIL because `loadSessionDetails` is not exported yet and `finishFocusSession` still has the old signature.

- [ ] **Step 3: Implement the Tauri commands and API bridge**

Update `/Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/src/error.rs`:

```rust
#[derive(Debug, Error)]
pub enum AppError {
    #[error("there is no active focus session")]
    NoActiveSession,
    #[error("the active focus session is paused")]
    SessionPaused,
    #[error("the provided session id does not match the active focus session")]
    SessionIdMismatch,
    #[error("foreground tracking is only supported on macOS")]
    UnsupportedPlatform,
    #[error("{0}")]
    Database(String),
    #[error(transparent)]
    Io(#[from] std::io::Error),
    #[error(transparent)]
    Serde(#[from] serde_json::Error),
}

impl AppError {
    pub fn database<E: ToString>(error: E) -> Self {
        Self::Database(error.to_string())
    }
}
```

Update `/Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/src/lib.rs`:

```rust
mod storage;

use std::path::PathBuf;
use std::sync::Mutex;

pub struct AppState {
    runtime: Mutex<FocusRuntime>,
    db_path: PathBuf,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let db_path = app
                .path()
                .app_data_dir()
                .map_err(AppError::database)?
                .join("pomodoro.db");

            if let Some(parent) = db_path.parent() {
                std::fs::create_dir_all(parent)?;
            }

            storage::init_database(&db_path)?;
            app.manage(AppState {
                runtime: Mutex::new(FocusRuntime::default()),
                db_path,
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::start_focus_session,
            commands::pause_focus_session,
            commands::resume_focus_session,
            commands::reset_focus_session,
            commands::capture_focus_sample,
            commands::load_session_details,
            commands::finish_focus_session
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

Update `/Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/src/commands.rs`:

```rust
use crate::models::{ForegroundSample, SessionDetail, SessionSummary};
use crate::storage;

#[tauri::command]
pub fn load_session_details(state: State<'_, AppState>) -> Result<Vec<SessionDetail>, AppError> {
    storage::load_session_details(&state.db_path)
}

#[tauri::command]
pub fn finish_focus_session(
    session: SessionSummary,
    state: State<'_, AppState>,
) -> Result<SessionDetail, AppError> {
    let completed = state.runtime.lock().unwrap().finish()?;

    if completed.session_id != session.id {
        return Err(AppError::SessionIdMismatch);
    }

    let usage = aggregate_samples(session.duration_seconds, &completed.samples);
    storage::save_session_detail(&state.db_path, &session, &usage)?;

    Ok(SessionDetail { session, usage })
}
```

Update `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/focusSessionApi.ts`:

```ts
import { invoke } from "@tauri-apps/api/core";
import type { SessionDetail, SessionSummary } from "./types";

function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function loadSessionDetails(): Promise<SessionDetail[]> {
  if (!isTauriRuntime()) {
    return [];
  }

  return invoke<SessionDetail[]>("load_session_details");
}

export async function finishFocusSession(session: SessionSummary): Promise<SessionDetail> {
  if (!isTauriRuntime()) {
    return { session, usage: [] };
  }

  return invoke<SessionDetail>("finish_focus_session", { session });
}
```

- [ ] **Step 4: Run the API tests and a full Rust compile check**

Run:

```bash
npm test -- focusSessionApi.test.ts
cargo test --manifest-path /Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/Cargo.toml
```

Expected:

- `focusSessionApi.test.ts` PASS
- Rust tests PASS, including the updated storage and stats tests

- [ ] **Step 5: Commit**

```bash
git add /Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/src/lib.rs /Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/src/commands.rs /Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/src/error.rs /Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/focusSessionApi.ts /Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/__tests__/focusSessionApi.test.ts
git commit -m "feat: wire sqlite-backed tauri session commands"
```

## Task 3: Bootstrap Persisted History In The React App

**Files:**
- Modify: `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/PomodoroApp.tsx`
- Modify: `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/__tests__/PomodoroApp.test.tsx`
- Modify: `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/__tests__/PomodoroApp.focusTracking.test.tsx`

- [ ] **Step 1: Write the failing UI tests for loading, retry, and save failure**

Update `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/__tests__/PomodoroApp.focusTracking.test.tsx` to mock the new API shape and add these tests:

```tsx
import React from "react";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PomodoroApp } from "../PomodoroApp";

const focusTrackingApi = vi.hoisted(() => ({
  loadSessionDetails: vi.fn().mockResolvedValue([]),
  startFocusSession: vi.fn().mockResolvedValue(undefined),
  pauseFocusSession: vi.fn().mockResolvedValue(undefined),
  resumeFocusSession: vi.fn().mockResolvedValue(undefined),
  resetFocusSession: vi.fn().mockResolvedValue(undefined),
  captureFocusSample: vi.fn().mockResolvedValue(undefined),
  finishFocusSession: vi.fn().mockImplementation(async (session) => ({
    session,
    usage: [
      {
        bundleId: "com.microsoft.VSCode",
        appName: "VS Code",
        durationSeconds: 60,
        percentage: 1,
      },
    ],
  })),
}));

vi.mock("../focusSessionApi", () => focusTrackingApi);

beforeEach(() => {
  focusTrackingApi.loadSessionDetails.mockReset();
  focusTrackingApi.loadSessionDetails.mockResolvedValue([]);
  focusTrackingApi.startFocusSession.mockClear();
  focusTrackingApi.pauseFocusSession.mockClear();
  focusTrackingApi.resumeFocusSession.mockClear();
  focusTrackingApi.resetFocusSession.mockClear();
  focusTrackingApi.captureFocusSample.mockClear();
  focusTrackingApi.finishFocusSession.mockReset();
  focusTrackingApi.finishFocusSession.mockImplementation(async (session) => ({
    session,
    usage: [
      {
        bundleId: "com.microsoft.VSCode",
        appName: "VS Code",
        durationSeconds: 60,
        percentage: 1,
      },
    ],
  }));
});

test("loads persisted history before rendering stats", async () => {
  const user = userEvent.setup();

  focusTrackingApi.loadSessionDetails.mockResolvedValueOnce([
    {
      session: {
        id: "persisted-1",
        mode: "focus",
        startedAt: "2026-07-07T09:00:00.000Z",
        endedAt: "2026-07-07T09:25:00.000Z",
        durationSeconds: 1500,
      },
      usage: [],
    },
  ]);

  render(<PomodoroApp now={() => new Date("2026-07-07T10:00:00.000Z")} />);

  expect(screen.getByText("记录加载中...")).toBeInTheDocument();
  expect(await screen.findByText("1", { selector: ".session-meta__value" })).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: /查看统计/i }));
  expect(screen.getByText("25m", { selector: ".stat-card__value" })).toBeInTheDocument();
});

test("retries after a history load failure", async () => {
  const user = userEvent.setup();

  focusTrackingApi.loadSessionDetails
    .mockRejectedValueOnce(new Error("db down"))
    .mockResolvedValueOnce([
      {
        session: {
          id: "persisted-2",
          mode: "focus",
          startedAt: "2026-07-07T11:00:00.000Z",
          endedAt: "2026-07-07T11:25:00.000Z",
          durationSeconds: 1500,
        },
        usage: [],
      },
    ]);

  render(<PomodoroApp now={() => new Date("2026-07-07T12:00:00.000Z")} />);

  expect(await screen.findByText("记录加载失败")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "重试" }));
  expect(await screen.findByText("1", { selector: ".session-meta__value" })).toBeInTheDocument();
});

test("does not add a completed session when persistence fails", async () => {
  const user = userEvent.setup();

  focusTrackingApi.finishFocusSession.mockRejectedValueOnce(new Error("save failed"));

  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-07-07T13:00:00+08:00"));

  try {
    render(<PomodoroApp initialDurations={{ focus: 60, shortBreak: 300, longBreak: 900 }} />);
    await screen.findByText("01:00");

    act(() => {
      screen.getByRole("button", { name: "开始" }).click();
    });

    await act(async () => {
      vi.advanceTimersByTime(60000);
      await Promise.resolve();
    });

    expect(await screen.findByText("保存失败")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /查看统计/i }));
    expect(screen.getByText("还没有历史记录")).toBeInTheDocument();
  } finally {
    vi.useRealTimers();
  }
});
```

Update `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/__tests__/PomodoroApp.test.tsx` so every render waits for bootstrap before making assertions, for example:

```tsx
render(<PomodoroApp />);
await screen.findByText("25:00");
```

Change the completion tests there from synchronous assertions to async persisted assertions, for example:

```tsx
await act(async () => {
  vi.advanceTimersByTime(60000);
  await Promise.resolve();
});

expect(await screen.findByText("1", { selector: ".session-meta__value" })).toBeInTheDocument();
```

- [ ] **Step 2: Run the targeted UI tests and verify they fail**

Run:

```bash
npm test -- PomodoroApp.test.tsx
npm test -- PomodoroApp.focusTracking.test.tsx
```

Expected: FAIL because the app does not load persisted history, does optimistic local inserts, and has no loading/retry/save-error UI yet.

- [ ] **Step 3: Implement the minimal React persistence flow**

Update `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/PomodoroApp.tsx`:

```tsx
import { useEffect, useRef, useState } from "react";
import {
  captureFocusSample,
  finishFocusSession,
  loadSessionDetails,
  pauseFocusSession,
  resetFocusSession,
  resumeFocusSession,
  startFocusSession,
} from "./focusSessionApi";

const [sessionDetailsById, setSessionDetailsById] = useState<Record<string, SessionDetail>>({});
const [isLoading, setIsLoading] = useState(true);
const [loadError, setLoadError] = useState<string | null>(null);
const [saveError, setSaveError] = useState<string | null>(null);

async function hydrateSessionDetails() {
  setIsLoading(true);
  setLoadError(null);

  try {
    const details = await loadSessionDetails();
    setSessionDetailsById(buildSessionDetailsById(details));
  } catch {
    setLoadError("记录加载失败");
  } finally {
    setIsLoading(false);
  }
}

useEffect(() => {
  void hydrateSessionDetails();
}, []);

async function persistCompletedSession(session: SessionSummary) {
  setSaveError(null);

  try {
    const detail = await finishFocusSession(session);
    setSessionDetailsById((current) => ({
      ...current,
      [detail.session.id]: detail,
    }));
  } catch {
    setSaveError("保存失败");
  }
}

function handleStart() {
  if (activeSessionStartedAtRef.current === null && timer.remainingSeconds > 0) {
    activeSessionIdRef.current = crypto.randomUUID();
    activeSessionStartedAtRef.current = now().toISOString();
    if (activeSessionIdRef.current !== null) {
      ignoreCommandFailure(startFocusSession(activeSessionIdRef.current));
    }
  } else if (activeSessionIdRef.current !== null) {
    ignoreCommandFailure(resumeFocusSession());
  }

  timer.start();
}

// inside onFinished:
void persistCompletedSession(session);

if (isLoading) {
  return (
    <main className="app-shell">
      <p>记录加载中...</p>
    </main>
  );
}

if (loadError !== null) {
  return (
    <main className="app-shell">
      <p role="alert">{loadError}</p>
      <button type="button" onClick={() => void hydrateSessionDetails()}>
        重试
      </button>
    </main>
  );
}

return (
  <>
    {saveError ? <p role="alert">{saveError}</p> : null}
    <TimerPage
      currentMode={timer.mode}
      modeDuration={timer.modeDuration}
      remainingSeconds={timer.remainingSeconds}
      completedCount={todayStats.completedCount}
      isRunning={timer.isRunning}
      onChangeMode={handleChangeMode}
      onStart={handleStart}
      onPause={handlePause}
      onReset={handleReset}
      onOpenStats={() => setPage({ name: "stats" })}
    />
  </>
);
```

Do not keep the old optimistic update block:

```tsx
setSessionDetailsById((current) => ({
  ...current,
  [sessionId]: {
    session,
    usage: [],
  },
}));
```

Delete it instead of trying to reconcile two sources of truth.

- [ ] **Step 4: Run the updated frontend tests**

Run:

```bash
npm test -- PomodoroApp.test.tsx
npm test -- PomodoroApp.focusTracking.test.tsx
```

Expected: both test files PASS, including the new loading/retry/save-failure cases.

- [ ] **Step 5: Commit**

```bash
git add /Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/PomodoroApp.tsx /Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/__tests__/PomodoroApp.test.tsx /Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/__tests__/PomodoroApp.focusTracking.test.tsx
git commit -m "feat: load and save pomodoro history through sqlite"
```

## Task 4: Run Full Verification Before Hand-off

**Files:**
- No code changes expected; this task verifies the integrated implementation.

- [ ] **Step 1: Run the full frontend suite**

Run:

```bash
npm test
```

Expected: PASS with all existing Pomodoro tests green, including the new API and persistence cases.

- [ ] **Step 2: Run the full Rust suite**

Run:

```bash
cargo test --manifest-path /Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/Cargo.toml
```

Expected: PASS with storage, stats, runtime, and error serialization tests green.

- [ ] **Step 3: Run a production frontend build**

Run:

```bash
npm run build
```

Expected: PASS with a clean Vite/TypeScript build and no type errors.

- [ ] **Step 4: Inspect the final diff before hand-off**

Run:

```bash
git status --short
git diff --stat
```

Expected:

- Only the planned persistence files are changed
- No unrelated user changes were reverted
- The existing dirty `UsageRow` work remains untouched

## Self-Review

- Spec coverage check:
  - SQLite schema and `user_version` migration are covered in Task 1.
  - `load_session_details` and persisted `finish_focus_session` are covered in Task 2.
  - React bootstrap, loading state, retry state, save failure behavior, and UUID IDs are covered in Task 3.
  - Automated verification is covered in Task 4.
- Placeholder scan:
  - No `TODO`, `TBD`, or “similar to previous task” shortcuts remain.
- Type consistency:
  - The plan consistently uses `SessionSummary`, `SessionUsageRow`, `SessionDetail`, `load_session_details`, and `finish_focus_session`.
