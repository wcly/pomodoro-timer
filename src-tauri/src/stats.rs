use std::collections::HashMap;

use chrono::{DateTime, Utc};
use crate::models::{ForegroundSample, SessionAppUsage, SessionRecord, TodayStats};

pub fn aggregate_samples(
    session_id: &str,
    session_duration_seconds: i64,
    samples: &[ForegroundSample],
) -> Vec<SessionAppUsage> {
    let mut seconds_by_bundle: HashMap<(String, String), i64> = HashMap::new();

    for sample in samples {
        let key = (sample.bundle_id.clone(), sample.app_name.clone());
        *seconds_by_bundle.entry(key).or_insert(0) += 1;
    }

    let mut rows: Vec<SessionAppUsage> = seconds_by_bundle
        .into_iter()
        .map(|((bundle_id, app_name), duration_seconds)| SessionAppUsage {
            session_id: session_id.to_string(),
            bundle_id,
            app_name,
            duration_seconds,
            percentage: duration_seconds as f64 / session_duration_seconds as f64,
        })
        .collect();

    rows.sort_by(|left, right| right.duration_seconds.cmp(&left.duration_seconds));
    rows
}

pub fn summarize_today(sessions: &[SessionRecord], day_start: DateTime<Utc>) -> TodayStats {
    let filtered: Vec<&SessionRecord> = sessions
        .iter()
        .filter(|session| session.started_at >= day_start)
        .collect();

    TodayStats {
        total_focus_seconds: filtered.iter().map(|session| session.duration_seconds).sum(),
        completed_count: filtered.len(),
    }
}

#[cfg(test)]
mod tests {
    use super::{aggregate_samples, summarize_today};
    use crate::models::{ForegroundSample, SessionRecord};
    use chrono::{TimeZone, Utc};

    #[test]
    fn aggregates_sample_seconds_by_bundle_id() {
        let samples = vec![
            ForegroundSample::new(
                "com.microsoft.VSCode",
                "VS Code",
                Utc.timestamp_opt(1, 0).unwrap(),
            ),
            ForegroundSample::new(
                "com.microsoft.VSCode",
                "VS Code",
                Utc.timestamp_opt(2, 0).unwrap(),
            ),
            ForegroundSample::new(
                "com.google.Chrome",
                "Chrome",
                Utc.timestamp_opt(3, 0).unwrap(),
            ),
        ];

        let rows = aggregate_samples("session-1", 3, &samples);

        assert_eq!(rows[0].app_name, "VS Code");
        assert_eq!(rows[0].duration_seconds, 2);
        assert_eq!(rows[1].app_name, "Chrome");
        assert_eq!(rows[1].duration_seconds, 1);
    }

    #[test]
    fn summarizes_only_todays_sessions() {
        let sessions = vec![
            SessionRecord::new_completed(
                "a",
                Utc.timestamp_opt(100, 0).unwrap(),
                Utc.timestamp_opt(1600, 0).unwrap(),
                1500,
            ),
            SessionRecord::new_completed(
                "b",
                Utc.timestamp_opt(10, 0).unwrap(),
                Utc.timestamp_opt(610, 0).unwrap(),
                600,
            ),
        ];

        let summary = summarize_today(&sessions, Utc.timestamp_opt(60, 0).unwrap());

        assert_eq!(summary.completed_count, 1);
        assert_eq!(summary.total_focus_seconds, 1500);
    }
}
