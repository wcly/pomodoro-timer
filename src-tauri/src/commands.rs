use chrono::Utc;
use tauri::State;

use crate::error::AppError;
use crate::foreground::current_foreground_app;
use crate::models::SessionAppUsage;
use crate::models::ForegroundSample;
use crate::stats::aggregate_samples;
use crate::AppState;

#[tauri::command]
pub fn start_focus_session(
    session_id: String,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    state
        .runtime
        .lock()
        .unwrap()
        .start(session_id)?;
    Ok(())
}

#[tauri::command]
pub fn pause_focus_session(state: State<'_, AppState>) -> Result<(), AppError> {
    state.runtime.lock().unwrap().pause()
}

#[tauri::command]
pub fn resume_focus_session(state: State<'_, AppState>) -> Result<(), AppError> {
    state.runtime.lock().unwrap().resume()
}

#[tauri::command]
pub fn reset_focus_session(state: State<'_, AppState>) -> Result<(), AppError> {
    state.runtime.lock().unwrap().reset()
}

#[tauri::command]
pub fn capture_focus_sample(state: State<'_, AppState>) -> Result<(), AppError> {
    let app = current_foreground_app()?;
    let sample = ForegroundSample::new(&app.bundle_id, &app.app_name, Utc::now());

    state.runtime.lock().unwrap().capture(sample)?;
    Ok(())
}

#[tauri::command]
pub fn finish_focus_session(
    session_id: String,
    duration_seconds: i64,
    state: State<'_, AppState>,
) -> Result<Vec<SessionAppUsage>, AppError> {
    let completed = state.runtime.lock().unwrap().finish()?;

    if completed.session_id != session_id {
        return Err(AppError::SessionIdMismatch);
    }

    Ok(aggregate_samples(
        &completed.session_id,
        duration_seconds,
        &completed.samples,
    ))
}
