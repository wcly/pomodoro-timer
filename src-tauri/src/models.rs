use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

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
#[serde(rename_all = "camelCase")]
pub struct SessionAppUsage {
    pub session_id: String,
    pub bundle_id: String,
    pub app_name: String,
    pub duration_seconds: i64,
    pub percentage: f64,
}
