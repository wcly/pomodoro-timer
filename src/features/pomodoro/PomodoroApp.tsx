import { useState } from "react";
import { SessionDetailPage } from "./screens/SessionDetailPage";
import { StatsPage } from "./screens/StatsPage";
import { TimerPage } from "./screens/TimerPage";
import type { SessionDetail, SessionSummary } from "./types";

const demoSessions: SessionSummary[] = [
  {
    id: "session-1",
    startedAt: "2026-07-03T14:30:00.000Z",
    endedAt: "2026-07-03T15:00:00.000Z",
    durationSeconds: 1500,
  },
  {
    id: "session-2",
    startedAt: "2026-07-03T16:00:00.000Z",
    endedAt: "2026-07-03T16:25:00.000Z",
    durationSeconds: 1500,
  },
];

const demoDetails: Record<string, SessionDetail> = {
  "session-1": {
    session: demoSessions[0],
    usage: [
      {
        bundleId: "com.microsoft.VSCode",
        appName: "VS Code",
        durationSeconds: 660,
        percentage: 0.44,
      },
      {
        bundleId: "com.google.Chrome",
        appName: "Chrome",
        durationSeconds: 390,
        percentage: 0.26,
      },
    ],
  },
  "session-2": {
    session: demoSessions[1],
    usage: [
      {
        bundleId: "md.obsidian",
        appName: "Obsidian",
        durationSeconds: 810,
        percentage: 0.54,
      },
      {
        bundleId: "com.apple.Safari",
        appName: "Safari",
        durationSeconds: 420,
        percentage: 0.28,
      },
    ],
  },
};

type PageState =
  | { name: "timer" }
  | { name: "stats" }
  | { name: "detail"; sessionId: string };

export function PomodoroApp() {
  const [page, setPage] = useState<PageState>({ name: "timer" });

  if (page.name === "stats") {
    return (
      <StatsPage
        todayStats={{ totalFocusSeconds: 8100, completedCount: 8 }}
        sessions={demoSessions}
        onBack={() => setPage({ name: "timer" })}
        onOpenSession={(sessionId) => setPage({ name: "detail", sessionId })}
      />
    );
  }

  if (page.name === "detail") {
    const detail = demoDetails[page.sessionId] ?? null;

    return <SessionDetailPage detail={detail} onBack={() => setPage({ name: "stats" })} />;
  }

  return (
    <TimerPage
      currentMode="focus"
      remainingSeconds={1500}
      completedCount={3}
      currentAppName="VS Code"
      onOpenStats={() => setPage({ name: "stats" })}
    />
  );
}
