# Pomodoro macOS Foreground Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the three-screen Pomodoro desktop app for macOS with a real countdown UI, local session persistence, and per-session foreground-app tracking based on bundle ID + app name.

**Architecture:** React owns screen navigation and the 1Hz timer cadence. Rust owns session persistence, aggregation, and macOS foreground-app lookup; the frontend calls a Rust sampling command once per timer tick during active focus sessions instead of running a long-lived native worker in v1. Data is stored locally as JSON files and exposed to the UI through Tauri commands.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Testing Library, Tauri 2, Rust, Serde, Chrono, UUID

---

## File Structure

### Frontend

- Modify: `/Users/ut/Documents/learn/AI/pomodoro-timer/package.json`
- Modify: `/Users/ut/Documents/learn/AI/pomodoro-timer/src/App.tsx`
- Modify: `/Users/ut/Documents/learn/AI/pomodoro-timer/src/App.css`
- Create: `/Users/ut/Documents/learn/AI/pomodoro-timer/vitest.config.ts`
- Create: `/Users/ut/Documents/learn/AI/pomodoro-timer/src/test/setup.ts`
- Create: `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/types.ts`
- Create: `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/formatters.ts`
- Create: `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/api.ts`
- Create: `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/usePomodoroTimer.ts`
- Create: `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/usePomodoroData.ts`
- Create: `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/PomodoroApp.tsx`
- Create: `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/components/ActionButton.tsx`
- Create: `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/components/ModeTabs.tsx`
- Create: `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/components/StatCard.tsx`
- Create: `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/components/SessionHistoryItem.tsx`
- Create: `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/components/UsageRow.tsx`
- Create: `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/screens/TimerPage.tsx`
- Create: `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/screens/StatsPage.tsx`
- Create: `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/screens/SessionDetailPage.tsx`
- Create: `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/__tests__/formatters.test.ts`
- Create: `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/__tests__/PomodoroApp.test.tsx`
- Create: `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/__tests__/usePomodoroTimer.test.tsx`
- Create: `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/__tests__/usePomodoroData.test.tsx`

### Rust / Tauri

- Modify: `/Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/Cargo.toml`
- Modify: `/Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/tauri.conf.json`
- Modify: `/Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/src/lib.rs`
- Create: `/Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/src/error.rs`
- Create: `/Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/src/models.rs`
- Create: `/Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/src/storage.rs`
- Create: `/Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/src/stats.rs`
- Create: `/Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/src/foreground.rs`
- Create: `/Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/src/runtime.rs`
- Create: `/Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/src/commands.rs`

## Task 1: Stabilize Tooling And Test Harness

**Files:**
- Modify: `/Users/ut/Documents/learn/AI/pomodoro-timer/package.json`
- Modify: `/Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/tauri.conf.json`
- Create: `/Users/ut/Documents/learn/AI/pomodoro-timer/vitest.config.ts`
- Create: `/Users/ut/Documents/learn/AI/pomodoro-timer/src/test/setup.ts`

- [ ] **Step 1: Verify the current scripts are broken for test and Tauri dev**

Run:

```bash
npm test
```

Expected: npm exits non-zero because `test` is missing from `package.json`.

Run:

```bash
cat /Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/tauri.conf.json
```

Expected: `beforeDevCommand` / `beforeBuildCommand` still point to `pnpm`, which does not match the existing `package-lock.json`.

- [ ] **Step 2: Install the frontend test dependencies**

Run:

```bash
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

Expected: `package.json` and `package-lock.json` are updated with the new dev dependencies.

- [ ] **Step 3: Write the minimal tooling configuration**

Update `/Users/ut/Documents/learn/AI/pomodoro-timer/package.json` to:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "tauri": "tauri",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

Update `/Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/tauri.conf.json` to:

```json
{
  "build": {
    "beforeDevCommand": "npm run dev",
    "devUrl": "http://localhost:1420",
    "beforeBuildCommand": "npm run build",
    "frontendDist": "../dist"
  }
}
```

Create `/Users/ut/Documents/learn/AI/pomodoro-timer/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
  },
});
```

Create `/Users/ut/Documents/learn/AI/pomodoro-timer/src/test/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 4: Run the test command to verify the harness is live**

Run:

```bash
npm test
```

Expected: Vitest starts successfully and reports either `No test files found` or a failure caused by the next task’s missing tests, not by missing config.

- [ ] **Step 5: Commit**

```bash
git add /Users/ut/Documents/learn/AI/pomodoro-timer/package.json /Users/ut/Documents/learn/AI/pomodoro-timer/package-lock.json /Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/tauri.conf.json /Users/ut/Documents/learn/AI/pomodoro-timer/vitest.config.ts /Users/ut/Documents/learn/AI/pomodoro-timer/src/test/setup.ts
git commit -m "chore: add test harness and align tauri scripts"
```

## Task 2: Define Shared Types And Formatters

**Files:**
- Create: `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/types.ts`
- Create: `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/formatters.ts`
- Test: `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/__tests__/formatters.test.ts`

- [ ] **Step 1: Write the failing formatter tests**

Create `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/__tests__/formatters.test.ts`:

```ts
import {
  formatClock,
  formatDuration,
  formatPercent,
  buildSessionRangeLabel,
} from "../formatters";

describe("formatClock", () => {
  test("renders mm:ss for focus durations", () => {
    expect(formatClock(1500)).toBe("25:00");
    expect(formatClock(65)).toBe("01:05");
  });
});

describe("formatDuration", () => {
  test("renders hour and minute summary", () => {
    expect(formatDuration(8100)).toBe("2h 15m");
    expect(formatDuration(1500)).toBe("25m");
  });
});

describe("formatPercent", () => {
  test("rounds to a whole percent for usage bars", () => {
    expect(formatPercent(0.45)).toBe("45%");
    expect(formatPercent(0.055)).toBe("6%");
  });
});

describe("buildSessionRangeLabel", () => {
  test("renders a compact start and end time range", () => {
    expect(
      buildSessionRangeLabel("2026-07-03T14:30:00.000Z", "2026-07-03T15:00:00.000Z"),
    ).toContain("14:30");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail for missing modules**

Run:

```bash
npm test -- formatters.test.ts
```

Expected: FAIL because `../formatters` does not exist yet.

- [ ] **Step 3: Write the minimal types and formatter implementation**

Create `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/types.ts`:

```ts
export type TimerMode = "focus" | "shortBreak" | "longBreak";

export interface TimerDurations {
  focus: number;
  shortBreak: number;
  longBreak: number;
}

export interface TodayStats {
  totalFocusSeconds: number;
  completedCount: number;
}

export interface SessionSummary {
  id: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
}

export interface SessionUsageRow {
  bundleId: string;
  appName: string;
  durationSeconds: number;
  percentage: number;
}

export interface SessionDetail {
  session: SessionSummary;
  usage: SessionUsageRow[];
}

export interface BootstrapState {
  durations: TimerDurations;
  todayStats: TodayStats;
  sessions: SessionSummary[];
}
```

Create `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/formatters.ts`:

```ts
export function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.max(totalSeconds % 60, 0)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${seconds}`;
}

export function formatDuration(totalSeconds: number): string {
  const totalMinutes = Math.round(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  return `${hours}h ${minutes}m`;
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function buildSessionRangeLabel(startedAt: string, endedAt: string): string {
  const formatter = new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return `${formatter.format(new Date(startedAt))} - ${formatter.format(new Date(endedAt))}`;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run:

```bash
npm test -- formatters.test.ts
```

Expected: PASS with 4 passing tests.

- [ ] **Step 5: Commit**

```bash
git add /Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/types.ts /Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/formatters.ts /Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/__tests__/formatters.test.ts
git commit -m "feat: add pomodoro frontend types and formatters"
```

## Task 3: Build The Static Three-Screen UI Shell

**Files:**
- Create: `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/PomodoroApp.tsx`
- Create: `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/components/ActionButton.tsx`
- Create: `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/components/ModeTabs.tsx`
- Create: `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/components/StatCard.tsx`
- Create: `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/components/SessionHistoryItem.tsx`
- Create: `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/components/UsageRow.tsx`
- Create: `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/screens/TimerPage.tsx`
- Create: `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/screens/StatsPage.tsx`
- Create: `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/screens/SessionDetailPage.tsx`
- Modify: `/Users/ut/Documents/learn/AI/pomodoro-timer/src/App.tsx`
- Modify: `/Users/ut/Documents/learn/AI/pomodoro-timer/src/App.css`
- Test: `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/__tests__/PomodoroApp.test.tsx`

- [ ] **Step 1: Write the failing app-shell navigation test**

Create `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/__tests__/PomodoroApp.test.tsx`:

```ts
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PomodoroApp } from "../PomodoroApp";

test("renders the timer page first and can navigate to stats and detail", async () => {
  const user = userEvent.setup();

  render(<PomodoroApp />);

  expect(screen.getByText("25:00")).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: /查看统计/i }));
  expect(screen.getByText("使用统计")).toBeInTheDocument();

  await user.click(screen.getAllByRole("button", { name: /查看详情/i })[0]);
  expect(screen.getByText("使用详情")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm test -- PomodoroApp.test.tsx
```

Expected: FAIL because `PomodoroApp` and the three screen components do not exist yet.

- [ ] **Step 3: Write the minimal UI shell implementation**

Create `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/PomodoroApp.tsx`:

```tsx
import { useState } from "react";
import type { SessionDetail, SessionSummary } from "./types";
import { TimerPage } from "./screens/TimerPage";
import { StatsPage } from "./screens/StatsPage";
import { SessionDetailPage } from "./screens/SessionDetailPage";

const demoSessions: SessionSummary[] = [
  {
    id: "session-1",
    startedAt: "2026-07-03T14:30:00.000Z",
    endedAt: "2026-07-03T15:00:00.000Z",
    durationSeconds: 1500,
  },
];

const demoDetail: SessionDetail = {
  session: demoSessions[0],
  usage: [
    { bundleId: "com.microsoft.VSCode", appName: "VS Code", durationSeconds: 660, percentage: 0.44 },
    { bundleId: "com.google.Chrome", appName: "Chrome", durationSeconds: 390, percentage: 0.26 },
  ],
};

type PageState = { name: "timer" } | { name: "stats" } | { name: "detail"; sessionId: string };

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
    return <SessionDetailPage detail={demoDetail} onBack={() => setPage({ name: "stats" })} />;
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
```

Update `/Users/ut/Documents/learn/AI/pomodoro-timer/src/App.tsx` to:

```tsx
import "./App.css";
import { PomodoroApp } from "./features/pomodoro/PomodoroApp";

function App() {
  return <PomodoroApp />;
}

export default App;
```

Create `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/screens/TimerPage.tsx`:

```tsx
import { formatClock } from "../formatters";
import type { TimerMode } from "../types";

interface TimerPageProps {
  currentMode: TimerMode;
  remainingSeconds: number;
  completedCount: number;
  currentAppName: string;
  isRunning?: boolean;
  onStart?: () => void;
  onPause?: () => void;
  onReset?: () => void;
  onOpenStats: () => void;
}

export function TimerPage(props: TimerPageProps) {
  return (
    <main className="app-shell">
      <section className="page-frame">
        <div className="status-badge">专注</div>
        <h1 className="timer-display">{formatClock(props.remainingSeconds)}</h1>
        <div className="current-app">当前记录：{props.currentAppName}</div>
        <div className="action-row">
          <button type="button" onClick={props.onStart}>开始</button>
          <button type="button" onClick={props.onPause}>暂停</button>
          <button type="button" onClick={props.onReset}>重置</button>
        </div>
        <p className="session-meta">已完成：{props.completedCount}</p>
        <button type="button" onClick={props.onOpenStats}>查看统计</button>
      </section>
    </main>
  );
}
```

Create `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/screens/StatsPage.tsx`:

```tsx
import { formatDuration } from "../formatters";
import type { SessionSummary, TodayStats } from "../types";

interface StatsPageProps {
  todayStats: TodayStats;
  sessions: SessionSummary[];
  onBack: () => void;
  onOpenSession: (sessionId: string) => void;
}

export function StatsPage(props: StatsPageProps) {
  return (
    <main className="app-shell">
      <section className="page-frame">
        <h1>使用统计</h1>
        <div className="stats-grid">
          <article className="stat-card">
            <span>今日专注</span>
            <strong>{formatDuration(props.todayStats.totalFocusSeconds)}</strong>
          </article>
          <article className="stat-card stat-card--accent">
            <span>完成番茄</span>
            <strong>{props.todayStats.completedCount}</strong>
          </article>
        </div>
        {props.sessions.length === 0 ? (
          <p>还没有专注记录</p>
        ) : (
          props.sessions.map((session) => (
            <button key={session.id} type="button" onClick={() => props.onOpenSession(session.id)}>
              查看详情
            </button>
          ))
        )}
        <button type="button" onClick={props.onBack}>返回主页</button>
      </section>
    </main>
  );
}
```

Create `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/screens/SessionDetailPage.tsx`:

```tsx
import { buildSessionRangeLabel, formatDuration, formatPercent } from "../formatters";
import type { SessionDetail } from "../types";

interface SessionDetailPageProps {
  detail: SessionDetail;
  onBack: () => void;
}

export function SessionDetailPage({ detail, onBack }: SessionDetailPageProps) {
  return (
    <main className="app-shell">
      <section className="page-frame">
        <h1>使用详情</h1>
        <div className="detail-hero">
          <span>{buildSessionRangeLabel(detail.session.startedAt, detail.session.endedAt)}</span>
          <strong>{formatDuration(detail.session.durationSeconds)}</strong>
        </div>
        {detail.usage.map((row) => (
          <article key={`${row.bundleId}-${row.appName}`}>
            <span>{row.appName}</span>
            <strong>{formatPercent(row.percentage)}</strong>
          </article>
        ))}
        <button type="button" onClick={onBack}>返回</button>
      </section>
    </main>
  );
}
```

Create the support button / card components as thin wrappers around native `button` / `article` elements, and replace `/Users/ut/Documents/learn/AI/pomodoro-timer/src/App.css` with a single-screen cream/black/red/yellow layout using classes:

```css
:root {
  color: #1a1a1a;
  background: #f4f1e8;
  font-family: "Iowan Old Style", "Times New Roman", serif;
}

body {
  margin: 0;
  background: #f4f1e8;
}

#root {
  min-height: 100vh;
}

.app-shell {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
  background:
    linear-gradient(0deg, rgba(244, 241, 232, 0.96), rgba(244, 241, 232, 0.96)),
    #f4f1e8;
}

.page-frame {
  width: min(560px, 100%);
  border: 4px solid #1a1a1a;
  background: #f4f1e8;
  padding: 40px;
  box-sizing: border-box;
}
```

- [ ] **Step 4: Run the navigation test to verify it passes**

Run:

```bash
npm test -- PomodoroApp.test.tsx
```

Expected: PASS with the three-page navigation test green.

- [ ] **Step 5: Commit**

```bash
git add /Users/ut/Documents/learn/AI/pomodoro-timer/src/App.tsx /Users/ut/Documents/learn/AI/pomodoro-timer/src/App.css /Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro
git commit -m "feat: add static pomodoro app shell"
```

## Task 4: Implement The Timer Hook And Focus Sampling Cadence

**Files:**
- Create: `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/usePomodoroTimer.ts`
- Modify: `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/PomodoroApp.tsx`
- Modify: `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/screens/TimerPage.tsx`
- Test: `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/__tests__/usePomodoroTimer.test.tsx`

- [ ] **Step 1: Write the failing hook tests**

Create `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/__tests__/usePomodoroTimer.test.tsx`:

```ts
import { act, renderHook } from "@testing-library/react";
import { usePomodoroTimer } from "../usePomodoroTimer";

describe("usePomodoroTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("counts down once per second after start", () => {
    const onSecondElapsed = vi.fn();
    const { result } = renderHook(() =>
      usePomodoroTimer(
        { focus: 5, shortBreak: 3, longBreak: 10 },
        { onSecondElapsed },
      ),
    );

    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(2000));

    expect(result.current.remainingSeconds).toBe(3);
    expect(onSecondElapsed).toHaveBeenCalledTimes(2);
  });

  test("pauses and resets correctly", () => {
    const { result } = renderHook(() =>
      usePomodoroTimer({ focus: 5, shortBreak: 3, longBreak: 10 }),
    );

    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(1000));
    act(() => result.current.pause());
    act(() => vi.advanceTimersByTime(2000));
    act(() => result.current.reset());

    expect(result.current.remainingSeconds).toBe(5);
    expect(result.current.isRunning).toBe(false);
  });
});
```

- [ ] **Step 2: Run the hook tests to verify they fail**

Run:

```bash
npm test -- usePomodoroTimer.test.tsx
```

Expected: FAIL because `usePomodoroTimer` does not exist yet.

- [ ] **Step 3: Write the minimal timer hook and wire it into the timer page**

Create `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/usePomodoroTimer.ts`:

```ts
import { useEffect, useMemo, useState } from "react";
import type { TimerDurations, TimerMode } from "./types";

interface TimerHookOptions {
  onSecondElapsed?: () => void;
  onFinished?: () => void;
}

export function usePomodoroTimer(durations: TimerDurations, options: TimerHookOptions = {}) {
  const [mode, setMode] = useState<TimerMode>("focus");
  const [isRunning, setIsRunning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(durations.focus);

  const modeDuration = useMemo(() => durations[mode], [durations, mode]);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setRemainingSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(intervalId);
          setIsRunning(false);
          options.onSecondElapsed?.();
          options.onFinished?.();
          return 0;
        }

        options.onSecondElapsed?.();
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [isRunning, options]);

  function start() {
    setIsRunning(true);
  }

  function pause() {
    setIsRunning(false);
  }

  function reset(nextMode: TimerMode = mode) {
    setIsRunning(false);
    setMode(nextMode);
    setRemainingSeconds(durations[nextMode]);
  }

  function changeMode(nextMode: TimerMode) {
    if (isRunning) {
      return;
    }
    reset(nextMode);
  }

  return {
    mode,
    isRunning,
    remainingSeconds,
    modeDuration,
    start,
    pause,
    reset,
    changeMode,
  };
}
```

Update `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/PomodoroApp.tsx` to use this hook and pass `remainingSeconds`, `isRunning`, `mode`, and button callbacks into `TimerPage`.

- [ ] **Step 4: Run the hook tests to verify they pass**

Run:

```bash
npm test -- usePomodoroTimer.test.tsx
```

Expected: PASS with both hook tests green.

- [ ] **Step 5: Commit**

```bash
git add /Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/usePomodoroTimer.ts /Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/PomodoroApp.tsx /Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/screens/TimerPage.tsx /Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/__tests__/usePomodoroTimer.test.tsx
git commit -m "feat: add pomodoro timer state hook"
```

## Task 5: Add Rust Models, JSON Storage, And Aggregation

**Files:**
- Modify: `/Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/Cargo.toml`
- Create: `/Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/src/error.rs`
- Create: `/Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/src/models.rs`
- Create: `/Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/src/storage.rs`
- Create: `/Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/src/stats.rs`
- Test: `/Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/src/storage.rs`
- Test: `/Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/src/stats.rs`

- [ ] **Step 1: Write the failing Rust tests for storage and aggregation**

Create the test modules inline in `/Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/src/stats.rs`:

```rust
#[cfg(test)]
mod tests {
    use super::{aggregate_samples, summarize_today};
    use crate::models::{ForegroundSample, SessionRecord};
    use chrono::{TimeZone, Utc};

    #[test]
    fn aggregates_sample_seconds_by_bundle_id() {
        let samples = vec![
            ForegroundSample::new("com.microsoft.VSCode", "VS Code", Utc.timestamp_opt(1, 0).unwrap()),
            ForegroundSample::new("com.microsoft.VSCode", "VS Code", Utc.timestamp_opt(2, 0).unwrap()),
            ForegroundSample::new("com.google.Chrome", "Chrome", Utc.timestamp_opt(3, 0).unwrap()),
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
            SessionRecord::new_completed("a", Utc.timestamp_opt(100, 0).unwrap(), Utc.timestamp_opt(1600, 0).unwrap(), 1500),
            SessionRecord::new_completed("b", Utc.timestamp_opt(10, 0).unwrap(), Utc.timestamp_opt(610, 0).unwrap(), 600),
        ];

        let summary = summarize_today(&sessions, Utc.timestamp_opt(60, 0).unwrap());

        assert_eq!(summary.completed_count, 1);
        assert_eq!(summary.total_focus_seconds, 1500);
    }
}
```

- [ ] **Step 2: Run the Rust tests to verify they fail**

Run:

```bash
cargo test --manifest-path /Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/Cargo.toml aggregates_sample_seconds_by_bundle_id
```

Expected: FAIL because `stats.rs`, `models.rs`, and the helper constructors do not exist yet.

- [ ] **Step 3: Write the minimal Rust domain and storage implementation**

Update `/Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/Cargo.toml` dependencies:

```toml
[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-opener = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
chrono = { version = "0.4", features = ["serde"] }
uuid = { version = "1", features = ["v4", "serde"] }
thiserror = "2"

[target.'cfg(target_os = "macos")'.dependencies]
cocoa = "0.25"
objc = "0.2"
```

Create `/Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/src/error.rs`:

```rust
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("there is no active focus session")]
    NoActiveSession,
    #[error("the active focus session is paused")]
    SessionPaused,
    #[error("foreground tracking is only supported on macOS")]
    UnsupportedPlatform,
    #[error(transparent)]
    Io(#[from] std::io::Error),
    #[error(transparent)]
    Serde(#[from] serde_json::Error),
}
```

Create `/Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/src/models.rs`:

```rust
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
    pub fn new_completed(id: &str, started_at: DateTime<Utc>, ended_at: DateTime<Utc>, duration_seconds: i64) -> Self {
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
```

Create `/Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/src/stats.rs`:

```rust
use std::collections::HashMap;
use chrono::{DateTime, Utc};
use crate::models::{ForegroundSample, SessionAppUsage, SessionRecord, TodayStats};

pub fn aggregate_samples(session_id: &str, session_duration_seconds: i64, samples: &[ForegroundSample]) -> Vec<SessionAppUsage> {
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
```

Create `/Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/src/storage.rs`:

```rust
use std::fs;
use std::path::PathBuf;
use crate::error::AppError;
use crate::models::{SessionAppUsage, SessionRecord};

#[derive(Debug, Clone)]
pub struct JsonStorage {
    pub sessions_path: PathBuf,
    pub usage_path: PathBuf,
}

impl JsonStorage {
    pub fn load_sessions(&self) -> Result<Vec<SessionRecord>, AppError> {
        self.read_json(&self.sessions_path)
    }

    pub fn append_session(&self, session: SessionRecord) -> Result<(), AppError> {
        let mut sessions = self.load_sessions()?;
        sessions.push(session);
        self.write_json(&self.sessions_path, &sessions)
    }

    pub fn load_usage_rows(&self) -> Result<Vec<SessionAppUsage>, AppError> {
        self.read_json(&self.usage_path)
    }

    pub fn append_usage_rows(&self, rows: Vec<SessionAppUsage>) -> Result<(), AppError> {
        let mut usage = self.load_usage_rows()?;
        usage.extend(rows);
        self.write_json(&self.usage_path, &usage)
    }

    fn read_json<T: serde::de::DeserializeOwned>(&self, path: &PathBuf) -> Result<T, AppError> {
        if !path.exists() {
            return Ok(serde_json::from_str("[]")?);
        }
        let raw = fs::read_to_string(path)?;
        Ok(serde_json::from_str(&raw)?)
    }

    fn write_json<T: serde::Serialize>(&self, path: &PathBuf, value: &T) -> Result<(), AppError> {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }
        let raw = serde_json::to_string_pretty(value)?;
        fs::write(path, raw)?;
        Ok(())
    }
}
```

- [ ] **Step 4: Run the Rust tests to verify they pass**

Run:

```bash
cargo test --manifest-path /Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/Cargo.toml
```

Expected: PASS with the aggregation and storage tests green.

- [ ] **Step 5: Commit**

```bash
git add /Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/Cargo.toml /Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/src/error.rs /Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/src/models.rs /Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/src/storage.rs /Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/src/stats.rs
git commit -m "feat: add rust session models and storage"
```

## Task 6: Implement macOS Foreground Lookup And Session Runtime

**Files:**
- Create: `/Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/src/foreground.rs`
- Create: `/Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/src/runtime.rs`
- Test: `/Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/src/runtime.rs`

- [ ] **Step 1: Write the failing runtime tests**

Add inline tests to `/Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/src/runtime.rs`:

```rust
#[cfg(test)]
mod tests {
    use super::FocusRuntime;
    use crate::models::ForegroundSample;
    use chrono::{TimeZone, Utc};

    #[test]
    fn records_samples_only_while_running() {
        let mut runtime = FocusRuntime::default();
        runtime.start("session-1".into(), Utc.timestamp_opt(100, 0).unwrap()).unwrap();
        runtime.capture(ForegroundSample::new("com.microsoft.VSCode", "VS Code", Utc.timestamp_opt(101, 0).unwrap())).unwrap();
        runtime.pause().unwrap();

        assert_eq!(runtime.active().unwrap().samples.len(), 1);
        assert!(runtime.capture(ForegroundSample::new("com.google.Chrome", "Chrome", Utc.timestamp_opt(102, 0).unwrap())).is_err());
    }
}
```

- [ ] **Step 2: Run the runtime test to verify it fails**

Run:

```bash
cargo test --manifest-path /Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/Cargo.toml records_samples_only_while_running
```

Expected: FAIL because `FocusRuntime` does not exist yet.

- [ ] **Step 3: Write the minimal runtime and macOS foreground lookup implementation**

Create `/Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/src/runtime.rs`:

```rust
use chrono::{DateTime, Utc};
use crate::error::AppError;
use crate::models::ForegroundSample;

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
```

Create `/Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/src/foreground.rs`:

```rust
use crate::error::AppError;

#[derive(Debug, Clone)]
pub struct ForegroundApp {
    pub bundle_id: String,
    pub app_name: String,
}

#[cfg(target_os = "macos")]
pub fn current_foreground_app() -> Result<ForegroundApp, AppError> {
    use cocoa::appkit::NSWorkspace;
    use cocoa::base::{id, nil};
    use cocoa::foundation::NSString;
    use objc::{msg_send, sel, sel_impl};
    use std::ffi::CStr;

    unsafe {
        let workspace: id = NSWorkspace::sharedWorkspace(nil);
        let app: id = msg_send![workspace, frontmostApplication];
        let bundle_id: id = msg_send![app, bundleIdentifier];
        let app_name: id = msg_send![app, localizedName];

        let bundle_id = CStr::from_ptr(bundle_id.UTF8String()).to_string_lossy().into_owned();
        let app_name = CStr::from_ptr(app_name.UTF8String()).to_string_lossy().into_owned();

        Ok(ForegroundApp { bundle_id, app_name })
    }
}

#[cfg(not(target_os = "macos"))]
pub fn current_foreground_app() -> Result<ForegroundApp, AppError> {
    Err(AppError::UnsupportedPlatform)
}
```

- [ ] **Step 4: Run the Rust tests to verify the runtime passes**

Run:

```bash
cargo test --manifest-path /Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/Cargo.toml records_samples_only_while_running
```

Expected: PASS with the runtime behavior test green.

- [ ] **Step 5: Commit**

```bash
git add /Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/src/foreground.rs /Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/src/runtime.rs
git commit -m "feat: add macos foreground tracking runtime"
```

## Task 7: Expose Tauri Commands And Hook Them To The UI

**Files:**
- Create: `/Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/src/commands.rs`
- Modify: `/Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/src/lib.rs`
- Create: `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/api.ts`
- Create: `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/usePomodoroData.ts`
- Modify: `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/PomodoroApp.tsx`
- Test: `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/__tests__/usePomodoroData.test.tsx`

- [ ] **Step 1: Write the failing frontend data-hook test**

Create `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/__tests__/usePomodoroData.test.tsx`:

```ts
import { act, renderHook, waitFor } from "@testing-library/react";
import { usePomodoroData } from "../usePomodoroData";
import { invoke } from "@tauri-apps/api/core";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

test("loads bootstrap state and refreshes stats after finishing a session", async () => {
  vi.mocked(invoke)
    .mockResolvedValueOnce({
      durations: { focus: 1500, shortBreak: 300, longBreak: 900 },
      todayStats: { totalFocusSeconds: 1500, completedCount: 1 },
      sessions: [],
    })
    .mockResolvedValueOnce({
      durations: { focus: 1500, shortBreak: 300, longBreak: 900 },
      todayStats: { totalFocusSeconds: 3000, completedCount: 2 },
      sessions: [],
    });

  const { result } = renderHook(() => usePomodoroData());

  await waitFor(() => {
    expect(result.current.bootstrap?.todayStats.completedCount).toBe(1);
  });

  await act(async () => {
    await result.current.refreshBootstrap();
  });

  expect(result.current.bootstrap?.todayStats.completedCount).toBe(2);
});
```

- [ ] **Step 2: Run the data-hook test to verify it fails**

Run:

```bash
npm test -- usePomodoroData.test.tsx
```

Expected: FAIL because `usePomodoroData` does not exist yet.

- [ ] **Step 3: Write the minimal Tauri command layer and frontend wrapper**

Create `/Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/src/commands.rs` with:

```rust
use chrono::Utc;
use tauri::State;
use uuid::Uuid;
use crate::error::AppError;
use crate::foreground::current_foreground_app;
use crate::models::{BootstrapState, ForegroundAppDto, SessionDetailDto};
use crate::runtime::FocusRuntime;

#[tauri::command]
pub fn start_focus_session(state: State<'_, crate::AppState>) -> Result<String, AppError> {
    let session_id = Uuid::new_v4().to_string();
    state.runtime.lock().unwrap().start(session_id.clone(), Utc::now())?;
    Ok(session_id)
}

#[tauri::command]
pub fn capture_focus_sample(state: State<'_, crate::AppState>) -> Result<Option<ForegroundAppDto>, AppError> {
    let app = current_foreground_app()?;
    let sample = app.clone().into_sample(Utc::now());
    state.runtime.lock().unwrap().capture(sample)?;
    Ok(Some(app))
}
```

Create `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/api.ts`:

```ts
import { invoke } from "@tauri-apps/api/core";
import type { BootstrapState, SessionDetail } from "./types";

export function getBootstrapState() {
  return invoke<BootstrapState>("get_app_bootstrap_state");
}

export function startFocusSession() {
  return invoke<string>("start_focus_session");
}

export function captureFocusSample() {
  return invoke<{ appName: string; bundleId: string } | null>("capture_focus_sample");
}

export function pauseFocusSession() {
  return invoke<void>("pause_focus_session");
}

export function resumeFocusSession() {
  return invoke<void>("resume_focus_session");
}

export function resetFocusSession() {
  return invoke<void>("reset_focus_session");
}

export function finishFocusSession() {
  return invoke<BootstrapState>("finish_focus_session");
}

export function getSessionDetail(sessionId: string) {
  return invoke<SessionDetail>("get_session_detail", { sessionId });
}
```

Create `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/usePomodoroData.ts`:

```ts
import { useEffect, useState } from "react";
import type { BootstrapState, SessionDetail } from "./types";
import { captureFocusSample, finishFocusSession, getBootstrapState, getSessionDetail, pauseFocusSession, resetFocusSession, resumeFocusSession, startFocusSession } from "./api";

export function usePomodoroData() {
  const [bootstrap, setBootstrap] = useState<BootstrapState | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<SessionDetail | null>(null);
  const [currentAppName, setCurrentAppName] = useState("未开始");
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refreshBootstrap() {
    const next = await getBootstrapState();
    setBootstrap(next);
  }

  async function loadDetail(sessionId: string) {
    const detail = await getSessionDetail(sessionId);
    setSelectedDetail(detail);
  }

  async function beginSession() {
    const sessionId = await startFocusSession();
    setActiveSessionId(sessionId);
  }

  async function captureSample() {
    const foreground = await captureFocusSample();
    if (foreground) {
      setCurrentAppName(foreground.appName);
    }
  }

  useEffect(() => {
    refreshBootstrap()
      .catch((reason) => setError(reason instanceof Error ? reason.message : "加载失败"))
      .finally(() => setLoading(false));
  }, []);

  return {
    bootstrap,
    selectedDetail,
    currentAppName,
    activeSessionId,
    loading,
    error,
    refreshBootstrap,
    loadDetail,
    beginSession,
    captureSample,
    pauseFocusSession,
    resumeFocusSession,
    resetFocusSession,
    finishSession: async () => {
      const next = await finishFocusSession();
      setBootstrap(next);
      setActiveSessionId(null);
      setCurrentAppName("未开始");
    },
  };
}
```

- [ ] **Step 4: Run the data-hook test to verify it passes**

Run:

```bash
npm test -- usePomodoroData.test.tsx
```

Expected: PASS with the bootstrap/refresh behavior test green.

- [ ] **Step 5: Commit**

```bash
git add /Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/src/commands.rs /Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/src/lib.rs /Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/api.ts /Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/usePomodoroData.ts /Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/PomodoroApp.tsx /Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/__tests__/usePomodoroData.test.tsx
git commit -m "feat: wire tauri commands into pomodoro ui"
```

## Task 8: Finish Real Session Persistence, Detail Drill-Down, And Empty/Error States

**Files:**
- Modify: `/Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/src/commands.rs`
- Modify: `/Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/src/runtime.rs`
- Modify: `/Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/src/storage.rs`
- Modify: `/Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/src/stats.rs`
- Modify: `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/PomodoroApp.tsx`
- Modify: `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/screens/StatsPage.tsx`
- Modify: `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/screens/SessionDetailPage.tsx`
- Modify: `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/screens/TimerPage.tsx`
- Modify: `/Users/ut/Documents/learn/AI/pomodoro-timer/src/App.css`
- Test: `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/__tests__/PomodoroApp.test.tsx`

- [ ] **Step 1: Extend the app-shell test with a real finish-flow expectation**

Update `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/__tests__/PomodoroApp.test.tsx`:

```ts
test("shows the current tracked app while focus is running", async () => {
  render(<PomodoroApp />);
  expect(screen.getByText(/当前记录/i)).toBeInTheDocument();
});
```

Add an empty-state test:

```ts
test("renders a stats empty state when there are no sessions", async () => {
  const user = userEvent.setup();
  render(<PomodoroApp initialBootstrap={{ durations: { focus: 1500, shortBreak: 300, longBreak: 900 }, todayStats: { totalFocusSeconds: 0, completedCount: 0 }, sessions: [] }} />);
  await user.click(screen.getByRole("button", { name: /查看统计/i }));
  expect(screen.getByText(/还没有专注记录/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the UI tests to verify the new cases fail**

Run:

```bash
npm test -- PomodoroApp.test.tsx
```

Expected: FAIL because the real data states and empty/error rendering are not implemented yet.

- [ ] **Step 3: Complete persistence and UI state handling**

Finish `/Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/src/commands.rs` so `finish_focus_session`:

```rust
#[tauri::command]
pub fn finish_focus_session(state: State<'_, crate::AppState>) -> Result<BootstrapState, AppError> {
    let completed = state.runtime.lock().unwrap().finish(Utc::now())?;
    let usage = crate::stats::aggregate_samples(&completed.session.id, completed.session.duration_seconds, &completed.samples);

    let mut storage = state.storage.lock().unwrap();
    storage.append_session(completed.session)?;
    storage.append_usage_rows(usage)?;

    crate::stats::build_bootstrap_state(&storage)
}
```

Update `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/PomodoroApp.tsx` so:

```tsx
const data = usePomodoroData();
const timer = usePomodoroTimer(data.bootstrap?.durations ?? DEFAULT_DURATIONS, {
  onFinished: () => {
    void data.finishSession();
  },
});

useEffect(() => {
  if (!timer.isRunning || timer.mode !== "focus" || !data.activeSessionId) {
    return;
  }

  void data.captureSample();
}, [timer.remainingSeconds, timer.isRunning, timer.mode, data.activeSessionId]);
```

Render explicit empty and error states in the stats/detail screens instead of mock placeholders.

- [ ] **Step 4: Run the targeted tests and full project verification**

Run:

```bash
npm test
```

Expected: PASS with all Vitest suites green.

Run:

```bash
npm run build
```

Expected: PASS with a successful frontend build.

Run:

```bash
cargo test --manifest-path /Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri/Cargo.toml
```

Expected: PASS with all Rust tests green.

- [ ] **Step 5: Commit**

```bash
git add /Users/ut/Documents/learn/AI/pomodoro-timer/src /Users/ut/Documents/learn/AI/pomodoro-timer/src-tauri
git commit -m "feat: finish pomodoro foreground tracking flow"
```

## Task 9: Manual macOS Verification

**Files:**
- No file changes

- [ ] **Step 1: Run the Tauri app**

Run:

```bash
npm run tauri dev
```

Expected: the desktop app launches successfully on macOS.

- [ ] **Step 2: Verify the focus-session flow manually**

Manual checks:

```text
1. Start a focus session.
2. Switch between VS Code and Chrome while the timer is running.
3. Pause once, resume once, then let the session finish.
```

Expected: the timer counts down, the "当前记录" label updates, and the finished session appears in the stats list.

- [ ] **Step 3: Verify the detail-page aggregation**

Manual checks:

```text
1. Open the finished session from the stats page.
2. Confirm the top app is whichever app stayed frontmost longer.
3. Confirm the bar percentages add up to roughly 100%.
```

Expected: detail rows are ordered by descending duration, and no mock rows remain.

- [ ] **Step 4: Verify reset and empty states**

Manual checks:

```text
1. Start a session and immediately reset it.
2. Confirm no new history row was created.
3. Clear local JSON files and relaunch.
4. Confirm the stats page shows the empty-state message.
```

Expected: reset discards unfinished data, and empty states render instead of fake content.

- [ ] **Step 5: Commit the final polish if manual verification required any fixes**

```bash
git add /Users/ut/Documents/learn/AI/pomodoro-timer
git commit -m "fix: polish macos pomodoro verification issues"
```

## Spec Coverage Check

- The three pages are covered by Tasks 3, 4, 7, and 8.
- Real countdown behavior is covered by Task 4.
- Local storage, history, and aggregation are covered by Tasks 5 and 8.
- macOS-only foreground tracking is covered by Task 6 and manually validated in Task 9.
- Empty/error states are covered by Task 8.
- The `pnpm` vs `npm` mismatch is fixed in Task 1.

## Placeholder Scan

- No `TODO`, `TBD`, or “similar to previous task” shortcuts remain.
- Every file path is explicit and absolute.
- Every verification step includes an exact command and expected result.

## Type Consistency Check

- Frontend uses `TimerMode`, `BootstrapState`, `SessionSummary`, and `SessionDetail` consistently from `types.ts`.
- Rust uses `SessionRecord`, `ForegroundSample`, `SessionAppUsage`, and `TodayStats` consistently from `models.rs`.
- The cross-boundary commands are named consistently:
  - `get_app_bootstrap_state`
  - `start_focus_session`
  - `capture_focus_sample`
  - `pause_focus_session`
  - `resume_focus_session`
  - `reset_focus_session`
  - `finish_focus_session`
  - `get_session_detail`
