use crate::error::AppError;
use crate::models::ForegroundSample;
use chrono::{DateTime, Utc};

#[derive(Debug, Default)]
pub struct FocusRuntime {
    active: Option<RunningFocusSession>,
}

#[derive(Debug)]
pub struct RunningFocusSession {
    pub session_id: String,
    pub started_at: DateTime<Utc>,
    pub paused: bool,
    pub samples: Vec<ForegroundSample>,
}

impl FocusRuntime {
    pub fn start(&mut self, session_id: String, started_at: DateTime<Utc>) -> Result<(), AppError> {
        self.active = Some(RunningFocusSession {
            session_id,
            started_at,
            paused: false,
            samples: Vec::new(),
        });
        Ok(())
    }

    pub fn pause(&mut self) -> Result<(), AppError> {
        let active = self.active.as_mut().ok_or(AppError::NoActiveSession)?;
        active.paused = true;
        Ok(())
    }

    pub fn resume(&mut self) -> Result<(), AppError> {
        let active = self.active.as_mut().ok_or(AppError::NoActiveSession)?;
        active.paused = false;
        Ok(())
    }

    pub fn capture(&mut self, sample: ForegroundSample) -> Result<(), AppError> {
        let active = self.active.as_mut().ok_or(AppError::NoActiveSession)?;
        if active.paused {
            return Err(AppError::SessionPaused);
        }
        active.samples.push(sample);
        Ok(())
    }

    pub fn active(&self) -> Option<&RunningFocusSession> {
        self.active.as_ref()
    }
}

#[cfg(test)]
mod tests {
    use super::FocusRuntime;
    use crate::models::ForegroundSample;
    use chrono::{TimeZone, Utc};

    #[test]
    fn records_samples_only_while_running() {
        let mut runtime = FocusRuntime::default();
        runtime
            .start("session-1".into(), Utc.timestamp_opt(100, 0).unwrap())
            .unwrap();
        runtime
            .capture(ForegroundSample::new(
                "com.microsoft.VSCode",
                "VS Code",
                Utc.timestamp_opt(101, 0).unwrap(),
            ))
            .unwrap();
        runtime.pause().unwrap();

        assert_eq!(runtime.active().unwrap().samples.len(), 1);
        assert!(
            runtime
                .capture(ForegroundSample::new(
                    "com.google.Chrome",
                    "Chrome",
                    Utc.timestamp_opt(102, 0).unwrap(),
                ))
                .is_err()
        );
    }
}
