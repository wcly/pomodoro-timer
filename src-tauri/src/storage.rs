use std::fs;
use std::path::{Path, PathBuf};

use crate::error::AppError;
use crate::models::{SessionAppUsage, SessionRecord};

#[derive(Debug, Clone)]
pub struct JsonStorage {
    pub sessions_path: PathBuf,
    pub usage_path: PathBuf,
}

impl JsonStorage {
    pub fn load_sessions(&self) -> Result<Vec<SessionRecord>, AppError> {
        self.read_json(&self.sessions_path)
    }

    pub fn append_session(&self, session: SessionRecord) -> Result<(), AppError> {
        let mut sessions = self.load_sessions()?;
        sessions.push(session);
        self.write_json(&self.sessions_path, &sessions)
    }

    pub fn load_usage_rows(&self) -> Result<Vec<SessionAppUsage>, AppError> {
        self.read_json(&self.usage_path)
    }

    pub fn append_usage_rows(&self, rows: Vec<SessionAppUsage>) -> Result<(), AppError> {
        let mut usage = self.load_usage_rows()?;
        usage.extend(rows);
        self.write_json(&self.usage_path, &usage)
    }

    fn read_json<T: serde::de::DeserializeOwned>(&self, path: &Path) -> Result<T, AppError> {
        if !path.exists() {
            return Ok(serde_json::from_str("[]")?);
        }

        let raw = fs::read_to_string(path)?;
        Ok(serde_json::from_str(&raw)?)
    }

    fn write_json<T: serde::Serialize>(&self, path: &Path, value: &T) -> Result<(), AppError> {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }

        let raw = serde_json::to_string_pretty(value)?;
        fs::write(path, raw)?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::JsonStorage;
    use crate::models::{SessionAppUsage, SessionRecord};
    use chrono::{TimeZone, Utc};
    use std::fs;
    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn missing_files_load_as_empty_vectors() {
        let storage = test_storage("missing");

        let sessions = storage.load_sessions().unwrap();
        let usage_rows = storage.load_usage_rows().unwrap();

        assert!(sessions.is_empty());
        assert!(usage_rows.is_empty());
    }

    #[test]
    fn append_and_reload_round_trip_persists_sessions_and_usage_rows() {
        let storage = test_storage("round-trip");
        let session = SessionRecord::new_completed(
            "session-1",
            Utc.timestamp_opt(100, 0).unwrap(),
            Utc.timestamp_opt(1600, 0).unwrap(),
            1500,
        );
        let usage_row = SessionAppUsage {
            session_id: "session-1".to_string(),
            bundle_id: "com.microsoft.VSCode".to_string(),
            app_name: "VS Code".to_string(),
            duration_seconds: 1200,
            percentage: 0.8,
        };

        storage.append_session(session.clone()).unwrap();
        storage.append_usage_rows(vec![usage_row.clone()]).unwrap();

        let sessions = storage.load_sessions().unwrap();
        let usage_rows = storage.load_usage_rows().unwrap();

        assert_eq!(sessions.len(), 1);
        assert_eq!(sessions[0].id, session.id);
        assert_eq!(usage_rows.len(), 1);
        assert_eq!(usage_rows[0].bundle_id, usage_row.bundle_id);
    }

    fn test_storage(name: &str) -> JsonStorage {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let root = std::env::temp_dir()
            .join(format!("pomodoro-timer-storage-{name}-{nonce}"));
        fs::create_dir_all(&root).unwrap();

        JsonStorage {
            sessions_path: root.join("sessions.json"),
            usage_path: root.join("usage.json"),
        }
    }
}
