use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionRecord {
    pub id: String,
    pub started_at: DateTime<Utc>,
    pub ended_at: DateTime<Utc>,
    pub duration_seconds: i64,
}

impl SessionRecord {
    pub fn new_completed(
        id: &str,
        started_at: DateTime<Utc>,
        ended_at: DateTime<Utc>,
        duration_seconds: i64,
    ) -> Self {
        Self {
            id: id.to_string(),
            started_at,
            ended_at,
            duration_seconds,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ForegroundSample {
    pub bundle_id: String,
    pub app_name: String,
    pub sampled_at: DateTime<Utc>,
}

impl ForegroundSample {
    pub fn new(bundle_id: &str, app_name: &str, sampled_at: DateTime<Utc>) -> Self {
        Self {
            bundle_id: bundle_id.to_string(),
            app_name: app_name.to_string(),
            sampled_at,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionAppUsage {
    pub session_id: String,
    pub bundle_id: String,
    pub app_name: String,
    pub duration_seconds: i64,
    pub percentage: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct TodayStats {
    pub total_focus_seconds: i64,
    pub completed_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BootstrapState {
    pub durations: TimerDurations,
    pub today_stats: TodayStats,
    pub sessions: Vec<SessionRecord>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimerDurations {
    pub focus: i64,
    pub short_break: i64,
    pub long_break: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ForegroundAppDto {
    pub bundle_id: String,
    pub app_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionDetailDto {
    pub session: SessionRecord,
    pub usage: Vec<SessionAppUsage>,
}
