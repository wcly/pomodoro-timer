mod commands;
mod error;
mod foreground;
mod models;
mod runtime;
mod stats;


use std::sync::Mutex;

use runtime::FocusRuntime;

pub struct AppState {
    runtime: Mutex<FocusRuntime>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState {
            runtime: Mutex::new(FocusRuntime::default()),
        })
        .invoke_handler(tauri::generate_handler![
            commands::start_focus_session,
            commands::pause_focus_session,
            commands::resume_focus_session,
            commands::reset_focus_session,
            commands::capture_focus_sample,
            commands::finish_focus_session
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}



