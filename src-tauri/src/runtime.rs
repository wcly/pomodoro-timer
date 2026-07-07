use crate::error::AppError;
use crate::models::ForegroundSample;

#[derive(Debug, Default)]
pub struct FocusRuntime {
    active: Option<RunningFocusSession>,
}

#[derive(Debug)]
pub(crate) struct CompletedFocusSession {
    pub session_id: String,
    pub samples: Vec<ForegroundSample>,
}

#[derive(Debug)]
pub(crate) struct RunningFocusSession {
    pub session_id: String,
    pub paused: bool,
    pub samples: Vec<ForegroundSample>,
}

impl FocusRuntime {
    pub fn start(&mut self, session_id: String) -> Result<(), AppError> {
        self.active = Some(RunningFocusSession {
            session_id,
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

    pub fn finish(&mut self) -> Result<CompletedFocusSession, AppError> {
        let active = self.active.take().ok_or(AppError::NoActiveSession)?;

        Ok(CompletedFocusSession {
            session_id: active.session_id,
            samples: active.samples,
        })
    }

    pub fn reset(&mut self) -> Result<(), AppError> {
        self.active.take().ok_or(AppError::NoActiveSession)?;
        Ok(())
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
        runtime.start("session-1".into()).unwrap();
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

    #[test]
    fn finish_returns_collected_samples_and_clears_the_active_session() {
        let mut runtime = FocusRuntime::default();
        runtime.start("session-1".into()).unwrap();
        runtime
            .capture(ForegroundSample::new(
                "com.microsoft.VSCode",
                "VS Code",
                Utc.timestamp_opt(101, 0).unwrap(),
            ))
            .unwrap();

        let completed = runtime.finish().unwrap();

        assert_eq!(completed.session_id, "session-1");
        assert_eq!(completed.samples.len(), 1);
        assert!(runtime.active().is_none());
    }
}
