import { useEffect, useRef, useState } from "react";
import { timerModeLabels } from "./components/ModeTabs";
import {
  captureFocusSample,
  finishFocusSession,
  loadSessionDetails,
  pauseFocusSession,
  resetFocusSession,
  resumeFocusSession,
  startFocusSession,
} from "./focusSessionApi";

import { SessionDetailPage } from "./screens/SessionDetailPage";
import { StatsPage } from "./screens/StatsPage";
import { TimerPage } from "./screens/TimerPage";
import type {
  SessionDetail,
  SessionHistoryItemViewModel,
  SessionSummary,
  TimerDurations,
  TimerMode,
  TodayStats,
} from "./types";
import { normalizeTimerMode } from "./types";
import { formatDuration } from "./formatters";
import { usePomodoroTimer } from "./usePomodoroTimer";

type PageState =
  | { name: "timer" }
  | { name: "stats" }
  | { name: "detail"; sessionId: string };

const DEFAULT_DURATIONS: TimerDurations = {
  focus: 1500,
  shortBreak: 300,
  longBreak: 900,
};

const weekdayLabels = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

type SessionSummaryInput = Omit<SessionSummary, "mode"> & { mode?: unknown };
type SessionDetailInput = Omit<SessionDetail, "session"> & { session: SessionSummaryInput };

function normalizeSessionSummary(session: SessionSummaryInput): SessionSummary {
  return {
    ...session,
    mode: normalizeTimerMode(session.mode),
  };
}

function buildSessionDetailsById(details: SessionDetailInput[]): Record<string, SessionDetail> {
  return Object.fromEntries(
    details.map((detail) => {
      const normalizedSession = normalizeSessionSummary(detail.session);

      return [
        normalizedSession.id,
        {
          ...detail,
          session: normalizedSession,
        },
      ];
    }),
  );
}

function sortSessionsDescending(sessions: SessionSummary[]): SessionSummary[] {
  return [...sessions].sort(
    (left, right) => new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime(),
  );
}

function isSameLocalDay(value: string, referenceDate: Date): boolean {
  const date = new Date(value);

  return (
    date.getFullYear() === referenceDate.getFullYear() &&
    date.getMonth() === referenceDate.getMonth() &&
    date.getDate() === referenceDate.getDate()
  );
}

function buildTodayStats(sessions: SessionSummary[], referenceDate: Date): TodayStats {
  const todaySessions = sessions.filter(
    (session) =>
      normalizeTimerMode(session.mode) === "focus" &&
      isSameLocalDay(session.startedAt, referenceDate),
  );

  return {
    totalFocusSeconds: todaySessions.reduce((total, session) => total + session.durationSeconds, 0),
    completedCount: todaySessions.length,
  };
}

function buildCalendarLabel(value: string): string {
  const date = new Date(value);

  return `${date.getMonth() + 1}月${date.getDate()}日 ${weekdayLabels[date.getDay()]}`;
}

function buildHistoryItems(sessions: SessionSummary[]): SessionHistoryItemViewModel[] {
  return sessions.map((session) => ({
    session: {
      ...session,
      mode: normalizeTimerMode(session.mode),
    },
    calendarLabel: buildCalendarLabel(session.startedAt),
    modeLabel: timerModeLabels[normalizeTimerMode(session.mode)],
    durationLabel: formatDuration(session.durationSeconds),
  }));
}

function ignoreCommandFailure(promise: Promise<unknown>) {
  void promise.catch(() => undefined);
}

interface PomodoroAppProps {
  initialDurations?: TimerDurations;
  initialSessionDetails?: SessionDetailInput[];
  now?: () => Date;
}

export function PomodoroApp({
  initialDurations = DEFAULT_DURATIONS,
  initialSessionDetails = [],
  now = () => new Date(),
}: PomodoroAppProps = {}) {
  const shouldHydratePersistedSessions = initialSessionDetails.length === 0;
  const [page, setPage] = useState<PageState>({ name: "timer" });
  const [sessionDetailsById, setSessionDetailsById] = useState<Record<string, SessionDetail>>(() =>
    buildSessionDetailsById(initialSessionDetails),
  );
  const [isLoading, setIsLoading] = useState(shouldHydratePersistedSessions);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const activeSessionIdRef = useRef<string | null>(null);
  const activeSessionStartedAtRef = useRef<string | null>(null);
  const currentModeRef = useRef<TimerMode>("focus");
  const currentModeDurationRef = useRef(initialDurations.focus);

  useEffect(() => {
    if (!shouldHydratePersistedSessions) {
      return;
    }

    let cancelled = false;

    async function hydrateSessionDetails() {
      setIsLoading(true);
      setLoadError(null);

      try {
        const details = await loadSessionDetails();

        if (cancelled) {
          return;
        }

        setSessionDetailsById(buildSessionDetailsById(details));
      } catch {
        if (cancelled) {
          return;
        }

        setLoadError("记录加载失败");
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void hydrateSessionDetails();

    return () => {
      cancelled = true;
    };
  }, [shouldHydratePersistedSessions]);

  const timer = usePomodoroTimer(initialDurations, {
    onSecondElapsed() {
      if (activeSessionIdRef.current === null) {
        return;
      }

      ignoreCommandFailure(captureFocusSample());
    },
    onFinished() {
      const sessionId = activeSessionIdRef.current;
      const startedAt = activeSessionStartedAtRef.current;

      if (sessionId === null || startedAt === null) {
        return;
      }

      const session: SessionSummary = {
        id: sessionId,
        mode: currentModeRef.current,
        startedAt,
        endedAt: now().toISOString(),
        durationSeconds: currentModeDurationRef.current,
      };

      void (async () => {
        setSaveError(null);

        try {
          const detail = await finishFocusSession(session);

          setSessionDetailsById((current) => ({
            ...current,
            [detail.session.id]: detail,
          }));
        } catch {
          setSaveError("保存失败");
        }
      })();

      activeSessionIdRef.current = null;
      activeSessionStartedAtRef.current = null;
    },
  });

  currentModeRef.current = timer.mode;
  currentModeDurationRef.current = timer.modeDuration;

  const sessions = sortSessionsDescending(
    Object.values(sessionDetailsById).map((detail) => detail.session),
  );
  const todayStats = buildTodayStats(sessions, now());
  const historyItems = buildHistoryItems(sessions);

  function clearActiveSession() {
    activeSessionIdRef.current = null;
    activeSessionStartedAtRef.current = null;
  }

  function handleStart() {
    if (activeSessionStartedAtRef.current === null && timer.remainingSeconds > 0) {
      activeSessionIdRef.current = crypto.randomUUID();
      activeSessionStartedAtRef.current = now().toISOString();

      if (activeSessionIdRef.current !== null) {
        ignoreCommandFailure(startFocusSession(activeSessionIdRef.current));
      }
    } else if (activeSessionIdRef.current !== null) {
      ignoreCommandFailure(resumeFocusSession());
    }

    timer.start();
  }

  function handleReset() {
    if (activeSessionIdRef.current !== null) {
      ignoreCommandFailure(resetFocusSession());
    }

    clearActiveSession();
    timer.reset();
  }

  function handleChangeMode(nextMode: TimerMode) {
    if (activeSessionIdRef.current !== null) {
      ignoreCommandFailure(resetFocusSession());
    }

    clearActiveSession();
    timer.changeMode(nextMode);
  }

  function handlePause() {
    if (activeSessionIdRef.current !== null) {
      ignoreCommandFailure(pauseFocusSession());
    }

    timer.pause();
  }

  async function handleRetryLoad() {
    setIsLoading(true);
    setLoadError(null);

    try {
      const details = await loadSessionDetails();
      setSessionDetailsById(buildSessionDetailsById(details));
    } catch {
      setLoadError("记录加载失败");
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <main className="app-shell">
        <p>记录加载中...</p>
      </main>
    );
  }

  if (loadError !== null) {
    return (
      <main className="app-shell">
        <p role="alert">{loadError}</p>
        <button type="button" onClick={() => void handleRetryLoad()}>
          重试
        </button>
      </main>
    );
  }

  if (page.name === "stats") {
    return (
      <StatsPage
        todayStats={todayStats}
        historyItems={historyItems}
        onBack={() => setPage({ name: "timer" })}
        onOpenSession={(sessionId) => setPage({ name: "detail", sessionId })}
      />
    );
  }

  if (page.name === "detail") {
    const detail = sessionDetailsById[page.sessionId] ?? null;

    return <SessionDetailPage detail={detail} onBack={() => setPage({ name: "stats" })} />;
  }

  return (
    <>
      {saveError ? <p role="alert">{saveError}</p> : null}
      <TimerPage
        currentMode={timer.mode}
        modeDuration={timer.modeDuration}
        remainingSeconds={timer.remainingSeconds}
        completedCount={todayStats.completedCount}
        isRunning={timer.isRunning}
        onChangeMode={handleChangeMode}
        onStart={handleStart}
        onPause={handlePause}
        onReset={handleReset}
        onOpenStats={() => setPage({ name: "stats" })}
      />
    </>
  );
}
