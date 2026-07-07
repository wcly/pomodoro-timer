use std::path::Path;

use rusqlite::{params, Connection};

use crate::error::AppError;
use crate::models::{SessionDetail, SessionSummary, SessionUsageRow};

fn open_connection(db_path: &Path) -> Result<Connection, AppError> {
    let connection = Connection::open(db_path).map_err(AppError::database)?;
    connection
        .execute_batch("PRAGMA foreign_keys = ON;")
        .map_err(AppError::database)?;
    Ok(connection)
}

pub fn init_database(db_path: &Path) -> Result<(), AppError> {
    let connection = open_connection(db_path)?;
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
    let mut connection = open_connection(db_path)?;
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
    let connection = open_connection(db_path)?;
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

        assert_eq!(
            loaded
                .iter()
                .map(|detail| detail.session.id.as_str())
                .collect::<Vec<_>>(),
            vec!["newer", "older"]
        );
    }
}
