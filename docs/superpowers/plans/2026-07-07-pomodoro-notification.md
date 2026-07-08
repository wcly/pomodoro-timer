# Pomodoro Notification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Send a system notification whenever a focus, short-break, or long-break timer reaches zero without changing the existing timer, persistence, or stats flows.

**Architecture:** Keep notifications entirely in the React feature layer. Add one small `notification.ts` helper that owns permission checks, fixed copy, and silent degradation, then call it from the existing `PomodoroApp` completion callback so the timer finish event stays the single integration point.

**Tech Stack:** React 19, TypeScript, Vitest, Web Notification API

---

## File Structure

- Create: `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/notification.ts`
  - Tiny wrapper around `globalThis.Notification` that maps `TimerMode` to fixed copy, requests permission when needed, and never throws to callers.
- Create: `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/__tests__/notification.test.ts`
  - Unit tests for granted/default/denied/unavailable/error notification paths.
- Modify: `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/PomodoroApp.tsx`
  - Reuse the existing timer completion callback and add one notification side effect that stays independent from session persistence.
- Modify: `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/__tests__/PomodoroApp.test.tsx`
  - Mock the notification helper and verify each timer mode triggers exactly one completion notification.

## Task 1: Add The Notification Helper With Unit Tests

**Files:**
- Create: `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/notification.ts`
- Create: `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/__tests__/notification.test.ts`

- [ ] **Step 1: Write the failing notification helper tests**

Create `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/__tests__/notification.test.ts`:

```ts
import { notifyTimerFinished } from "../notification";

const originalNotification = globalThis.Notification;

function installNotification(
  permission: NotificationPermission,
  requestResult: NotificationPermission = permission,
) {
  const send = vi.fn();
  const requestPermissionMock = vi.fn(async () => requestResult);

  class NotificationMock {
    static permission: NotificationPermission = permission;
    static requestPermission = requestPermissionMock;

    constructor(title: string, options?: NotificationOptions) {
      send(title, options);
    }
  }

  Object.defineProperty(globalThis, "Notification", {
    value: NotificationMock,
    configurable: true,
    writable: true,
  });

  return { send, requestPermission: requestPermissionMock };
}

afterEach(() => {
  if (originalNotification === undefined) {
    Reflect.deleteProperty(globalThis, "Notification");
    return;
  }

  Object.defineProperty(globalThis, "Notification", {
    value: originalNotification,
    configurable: true,
    writable: true,
  });
});

test("sends a focus completion notification when permission is already granted", async () => {
  const { send, requestPermission } = installNotification("granted");

  await notifyTimerFinished("focus");

  expect(requestPermission).not.toHaveBeenCalled();
  expect(send).toHaveBeenCalledWith("专注结束", { body: "该休息了。" });
});

test("requests permission before sending a short-break notification", async () => {
  const { send, requestPermission } = installNotification("default", "granted");

  await notifyTimerFinished("shortBreak");

  expect(requestPermission).toHaveBeenCalledTimes(1);
  expect(send).toHaveBeenCalledWith("短休息结束", { body: "可以继续专注了。" });
});

test("does nothing when permission is denied", async () => {
  const { send, requestPermission } = installNotification("denied");

  await notifyTimerFinished("longBreak");

  expect(requestPermission).not.toHaveBeenCalled();
  expect(send).not.toHaveBeenCalled();
});

test("returns quietly when notifications are unavailable", async () => {
  Reflect.deleteProperty(globalThis, "Notification");

  await expect(notifyTimerFinished("focus")).resolves.toBeUndefined();
});

test("swallows notification constructor errors", async () => {
  class ThrowingNotification {
    static permission: NotificationPermission = "granted";
    static requestPermission = vi.fn(async () => "granted" as const);

    constructor() {
      throw new Error("boom");
    }
  }

  Object.defineProperty(globalThis, "Notification", {
    value: ThrowingNotification,
    configurable: true,
    writable: true,
  });

  await expect(notifyTimerFinished("focus")).resolves.toBeUndefined();
});
```

- [ ] **Step 2: Run the notification tests and verify they fail**

Run:

```bash
npm test -- /Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/__tests__/notification.test.ts
```

Expected: FAIL because `../notification` does not exist yet.

- [ ] **Step 3: Write the minimal notification helper**

Create `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/notification.ts`:

```ts
import type { TimerMode } from "./types";

const completionMessages: Record<TimerMode, { title: string; body: string }> = {
  focus: {
    title: "专注结束",
    body: "该休息了。",
  },
  shortBreak: {
    title: "短休息结束",
    body: "可以继续专注了。",
  },
  longBreak: {
    title: "长休息结束",
    body: "可以开始下一轮了。",
  },
};

function getNotificationCtor(): typeof Notification | null {
  if (typeof globalThis === "undefined" || !("Notification" in globalThis)) {
    return null;
  }

  return globalThis.Notification;
}

export async function notifyTimerFinished(mode: TimerMode): Promise<void> {
  const NotificationCtor = getNotificationCtor();

  if (NotificationCtor === null) {
    return;
  }

  try {
    let permission = NotificationCtor.permission;

    if (permission === "default") {
      permission = await NotificationCtor.requestPermission();
    }

    if (permission !== "granted") {
      return;
    }

    const message = completionMessages[mode];

    new NotificationCtor(message.title, { body: message.body });
  } catch {
    return;
  }
}
```

- [ ] **Step 4: Run the notification tests and verify they pass**

Run:

```bash
npm test -- /Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/__tests__/notification.test.ts
```

Expected: PASS with 5 passing tests.

- [ ] **Step 5: Commit the helper and unit tests**

Run:

```bash
git add /Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/notification.ts /Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/__tests__/notification.test.ts
git commit -m "feat: add pomodoro notification helper"
```

## Task 2: Wire Notifications Into The Timer Completion Flow

**Files:**
- Modify: `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/PomodoroApp.tsx`
- Modify: `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/__tests__/PomodoroApp.test.tsx`

- [ ] **Step 1: Write the failing app integration test**

Update `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/__tests__/PomodoroApp.test.tsx` by adding this mock near the top of the file, before the first test:

```ts
const notificationApi = vi.hoisted(() => ({
  notifyTimerFinished: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../notification", () => notificationApi);

beforeEach(() => {
  notificationApi.notifyTimerFinished.mockClear();
});
```

Then add this new test at the bottom of the file:

```ts
test.each([
  {
    label: "focus",
    modeButtonName: null,
    durations: { focus: 60, shortBreak: 300, longBreak: 900 },
    expectedMode: "focus",
  },
  {
    label: "short break",
    modeButtonName: "短休息",
    durations: { focus: 1500, shortBreak: 60, longBreak: 900 },
    expectedMode: "shortBreak",
  },
  {
    label: "long break",
    modeButtonName: "长休息",
    durations: { focus: 1500, shortBreak: 300, longBreak: 60 },
    expectedMode: "longBreak",
  },
])("sends one completion notification for $label timers", async ({
  modeButtonName,
  durations,
  expectedMode,
}) => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-07-07T09:00:00+08:00"));

  try {
    render(<PomodoroApp initialDurations={durations} />);
    await act(async () => {
      await Promise.resolve();
    });

    if (modeButtonName !== null) {
      act(() => {
        screen.getByRole("button", { name: modeButtonName }).click();
      });
    }

    act(() => {
      screen.getByRole("button", { name: "开始" }).click();
    });

    await act(async () => {
      vi.advanceTimersByTime(60000);
      await Promise.resolve();
    });

    expect(notificationApi.notifyTimerFinished).toHaveBeenCalledTimes(1);
    expect(notificationApi.notifyTimerFinished).toHaveBeenCalledWith(expectedMode);
  } finally {
    vi.useRealTimers();
  }
});
```

- [ ] **Step 2: Run the app test and verify it fails**

Run:

```bash
npm test -- /Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/__tests__/PomodoroApp.test.tsx
```

Expected: FAIL because `notifyTimerFinished` is never called.

- [ ] **Step 3: Add the notification side effect to `PomodoroApp`**

Update the imports at the top of `/Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/PomodoroApp.tsx`:

```ts
import { notifyTimerFinished } from "./notification";
```

Then update the `onFinished()` callback inside the existing `usePomodoroTimer(initialDurations, { ... })` call:

```ts
  const timer = usePomodoroTimer(initialDurations, {
    onSecondElapsed() {
      if (activeSessionIdRef.current === null) {
        return;
      }

      ignoreCommandFailure(captureFocusSample());
    },
    onFinished() {
      ignoreCommandFailure(notifyTimerFinished(currentModeRef.current));

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
```

Why this exact placement:

- It reuses the one shared timer completion exit instead of sprinkling notification calls across buttons or pages.
- It keeps notification delivery independent from `finishFocusSession(session)` so persistence failure cannot suppress the reminder.
- It reuses the existing `ignoreCommandFailure(...)` helper instead of inventing another async fire-and-forget wrapper.

- [ ] **Step 4: Run the targeted app and helper tests and verify they pass**

Run:

```bash
npm test -- /Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/__tests__/notification.test.ts /Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/__tests__/PomodoroApp.test.tsx
```

Expected: PASS with the notification helper tests green and the new completion-notification integration test green.

- [ ] **Step 5: Run the full frontend test suite**

Run:

```bash
npm test
```

Expected: PASS with no failing Vitest suites.

- [ ] **Step 6: Commit the feature**

Run:

```bash
git add /Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/notification.ts /Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/PomodoroApp.tsx /Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/__tests__/notification.test.ts /Users/ut/Documents/learn/AI/pomodoro-timer/src/features/pomodoro/__tests__/PomodoroApp.test.tsx
git commit -m "feat: notify when pomodoro timers finish"
```
