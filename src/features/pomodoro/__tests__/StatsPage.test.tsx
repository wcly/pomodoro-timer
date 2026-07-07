import { render } from "@testing-library/react";
import { StatsPage } from "../screens/StatsPage";

test("renders the updated ardot stats page decorations", () => {
  const { container } = render(
    <StatsPage
      todayStats={{ totalFocusSeconds: 8100, completedCount: 8 }}
      historyItems={[
        {
          session: {
            id: "session-1",
            mode: "focus",
            startedAt: "2026-07-02T14:30:00+08:00",
            endedAt: "2026-07-02T15:00:00+08:00",
            durationSeconds: 1500,
          },
          calendarLabel: "7月2日 周三",
          modeLabel: "专注",
          durationLabel: "25m",
        },
      ]}
      onBack={() => undefined}
      onOpenSession={() => undefined}
    />,
  );

  expect(container.querySelector(".sheet-deco--stats-red")).toBeInTheDocument();
  expect(container.querySelector(".sheet-deco--stats-ink")).toBeInTheDocument();
});
