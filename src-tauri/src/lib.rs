mod error;
mod models;
mod stats;
mod storage;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use crate::models::ForegroundSample;
    use crate::stats::aggregate_samples;
    use crate::storage::JsonStorage;
    use chrono::{TimeZone, Utc};
    use std::path::PathBuf;

    #[test]
    fn task5_modules_are_integrated_into_the_application_crate() {
        let _storage = JsonStorage {
            sessions_path: PathBuf::from("sessions.json"),
            usage_path: PathBuf::from("usage.json"),
        };
        let samples = vec![ForegroundSample::new(
            "com.microsoft.VSCode",
            "VS Code",
            Utc.timestamp_opt(1, 0).unwrap(),
        )];

        let rows = aggregate_samples("session-1", 1, &samples);

        assert_eq!(rows.len(), 1);
    }
}
