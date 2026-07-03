use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("there is no active focus session")]
    NoActiveSession,
    #[error("the active focus session is paused")]
    SessionPaused,
    #[error("foreground tracking is only supported on macOS")]
    UnsupportedPlatform,
    #[error(transparent)]
    Io(#[from] std::io::Error),
    #[error(transparent)]
    Serde(#[from] serde_json::Error),
}
