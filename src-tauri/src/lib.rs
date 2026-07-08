mod commands;
mod error;
mod foreground;
mod models;
mod runtime;
mod storage;
mod stats;

use std::path::PathBuf;
use std::sync::Mutex;

use runtime::FocusRuntime;
use tauri::Manager;

use crate::error::AppError;

pub struct AppState {
    runtime: Mutex<FocusRuntime>,
    db_path: PathBuf,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
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
