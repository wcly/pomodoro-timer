use std::collections::HashMap;

use crate::models::{ForegroundSample, SessionAppUsage};

pub fn aggregate_samples(
    session_id: &str,
    session_duration_seconds: i64,
    samples: &[ForegroundSample],
) -> Vec<SessionAppUsage> {
    let percentage_denominator = if session_duration_seconds > 0 {
        session_duration_seconds as f64
    } else {
        0.0
    };
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
            percentage: if percentage_denominator > 0.0 {
                duration_seconds as f64 / percentage_denominator
            } else {
                0.0
            },
        })
        .collect();

    rows.sort_by(|left, right| {
        right
            .duration_seconds
            .cmp(&left.duration_seconds)
            .then_with(|| left.bundle_id.cmp(&right.bundle_id))
            .then_with(|| left.app_name.cmp(&right.app_name))
    });
    rows
}

#[cfg(test)]
mod tests {
    use super::aggregate_samples;
    use crate::models::ForegroundSample;
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
    fn returns_zero_percentages_when_session_duration_is_zero() {
        let samples = vec![
            ForegroundSample::new(
                "com.microsoft.VSCode",
                "VS Code",
                Utc.timestamp_opt(1, 0).unwrap(),
            ),
            ForegroundSample::new(
                "com.google.Chrome",
                "Chrome",
                Utc.timestamp_opt(2, 0).unwrap(),
            ),
        ];

        let rows = aggregate_samples("session-1", 0, &samples);

        assert_eq!(rows.len(), 2);
        assert_eq!(rows[0].percentage, 0.0);
        assert_eq!(rows[1].percentage, 0.0);
    }

    #[test]
    fn breaks_equal_duration_ties_by_bundle_id_then_app_name() {
        let samples = vec![
            ForegroundSample::new(
                "com.zeta.Editor",
                "Zeta",
                Utc.timestamp_opt(1, 0).unwrap(),
            ),
            ForegroundSample::new(
                "com.alpha.Editor",
                "Alpha",
                Utc.timestamp_opt(2, 0).unwrap(),
            ),
        ];

        let rows = aggregate_samples("session-1", 2, &samples);

        assert_eq!(rows[0].bundle_id, "com.alpha.Editor");
        assert_eq!(rows[0].app_name, "Alpha");
        assert_eq!(rows[1].bundle_id, "com.zeta.Editor");
        assert_eq!(rows[1].app_name, "Zeta");
    }
}
