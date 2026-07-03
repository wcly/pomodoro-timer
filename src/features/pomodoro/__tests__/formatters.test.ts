import {
  buildSessionRangeLabel,
  formatClock,
  formatDuration,
  formatPercent,
} from "../formatters";

function withTimeZone<T>(timeZone: string, callback: () => T): T {
  const previousTimeZone = process.env.TZ;
  process.env.TZ = timeZone;

  try {
    return callback();
  } finally {
    if (previousTimeZone === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = previousTimeZone;
    }
  }
}

describe("formatters", () => {
  test('formatClock(1500) === "25:00"', () => {
    expect(formatClock(1500)).toBe("25:00");
  });

  test('formatClock(65) === "01:05"', () => {
    expect(formatClock(65)).toBe("01:05");
  });

  test('formatDuration(8100) === "2h 15m"', () => {
    expect(formatDuration(8100)).toBe("2h 15m");
  });

  test('formatDuration(1500) === "25m"', () => {
    expect(formatDuration(1500)).toBe("25m");
  });

  test('formatPercent(0.45) === "45%"', () => {
    expect(formatPercent(0.45)).toBe("45%");
  });

  test('formatPercent(0.055) === "6%"', () => {
    expect(formatPercent(0.055)).toBe("6%");
  });

  test('buildSessionRangeLabel contains "14:30"', () => {
    const label = withTimeZone("UTC", () =>
      buildSessionRangeLabel(
        "2026-07-03T14:30:00.000Z",
        "2026-07-03T15:00:00.000Z",
      ),
    );

    expect(label).toContain("14:30");
  });

  test("buildSessionRangeLabel respects the current local timezone", () => {
    const label = withTimeZone("Asia/Shanghai", () =>
      buildSessionRangeLabel(
        "2026-07-03T14:30:00.000Z",
        "2026-07-03T15:00:00.000Z",
      ),
    );

    expect(label).toContain("22:30");
  });
});
