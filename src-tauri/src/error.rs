use serde::ser::{Serialize, Serializer};
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

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::AppError;

    #[test]
    fn serializes_as_a_string_error_payload() {
        let serialized = serde_json::to_string(&AppError::NoActiveSession).unwrap();

        assert_eq!(serialized, "\"there is no active focus session\"");
    }
}
