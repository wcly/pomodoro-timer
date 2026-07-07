import React from "react";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PomodoroApp } from "../PomodoroApp";

const focusTrackingApi = vi.hoisted(() => ({
  loadSessionDetails: vi.fn().mockResolvedValue([]),
  startFocusSession: vi.fn().mockResolvedValue(undefined),
  pauseFocusSession: vi.fn().mockResolvedValue(undefined),
  resumeFocusSession: vi.fn().mockResolvedValue(undefined),
  resetFocusSession: vi.fn().mockResolvedValue(undefined),
  captureFocusSample: vi.fn().mockResolvedValue(undefined),
  finishFocusSession: vi.fn().mockImplementation(async (session) => ({
    session,
    usage: [
      {
        bundleId: "com.microsoft.VSCode",
        appName: "VS Code",
        durationSeconds: 60,
        percentage: 1,
      },
    ],
  })),
}));

vi.mock("../focusSessionApi", () => focusTrackingApi);

beforeEach(() => {
  focusTrackingApi.loadSessionDetails.mockReset();
  focusTrackingApi.loadSessionDetails.mockResolvedValue([]);
  focusTrackingApi.startFocusSession.mockClear();
  focusTrackingApi.pauseFocusSession.mockClear();
  focusTrackingApi.resumeFocusSession.mockClear();
  focusTrackingApi.resetFocusSession.mockClear();
  focusTrackingApi.captureFocusSample.mockClear();
  focusTrackingApi.finishFocusSession.mockReset();
  focusTrackingApi.finishFocusSession.mockImplementation(async (session) => ({
    session,
    usage: [
      {
        bundleId: "com.microsoft.VSCode",
        appName: "VS Code",
        durationSeconds: 60,
        percentage: 1,
      },
    ],
  }));
});

test("loads persisted history before rendering stats", async () => {
  const user = userEvent.setup();

  focusTrackingApi.loadSessionDetails.mockResolvedValueOnce([
    {
      session: {
        id: "persisted-1",
        mode: "focus",
        startedAt: "2026-07-07T09:00:00.000Z",
        endedAt: "2026-07-07T09:25:00.000Z",
        durationSeconds: 1500,
      },
      usage: [],
    },
  ]);

  render(<PomodoroApp now={() => new Date("2026-07-07T10:00:00.000Z")} />);

  expect(screen.getByText("记录加载中...")).toBeInTheDocument();
  expect(await screen.findByText("1", { selector: ".session-meta__value" })).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: /查看统计/i }));
  expect(screen.getByText("25m", { selector: ".stat-card__value" })).toBeInTheDocument();
});

test("retries after a history load failure", async () => {
  const user = userEvent.setup();

  focusTrackingApi.loadSessionDetails
    .mockRejectedValueOnce(new Error("db down"))
    .mockResolvedValueOnce([
      {
        session: {
          id: "persisted-2",
          mode: "focus",
          startedAt: "2026-07-07T11:00:00.000Z",
          endedAt: "2026-07-07T11:25:00.000Z",
          durationSeconds: 1500,
        },
        usage: [],
      },
    ]);

  render(<PomodoroApp now={() => new Date("2026-07-07T12:00:00.000Z")} />);

  expect(await screen.findByText("记录加载失败")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "重试" }));
  expect(await screen.findByText("1", { selector: ".session-meta__value" })).toBeInTheDocument();
});

test("renders tracked app usage for a finished focus session", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-07-06T09:00:00+08:00"));

  try {
    render(<PomodoroApp initialDurations={{ focus: 60, shortBreak: 300, longBreak: 900 }} />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByText("01:00")).toBeInTheDocument();

    act(() => {
      screen.getByRole("button", { name: "开始" }).click();
    });

    await act(async () => {
      vi.advanceTimersByTime(60000);
      await Promise.resolve();
    });

    act(() => {
      screen.getByRole("button", { name: /查看统计/i }).click();
    });

    act(() => {
      screen.getByRole("button", { name: /查看详情/i }).click();
    });

    expect(screen.getByText("VS Code")).toBeInTheDocument();
    expect(screen.getByText("1m", { selector: ".usage-row__duration" })).toBeInTheDocument();
    expect(screen.getByText("100%", { selector: ".usage-row__percent" })).toBeInTheDocument();
    expect(screen.queryByText("暂无应用使用数据")).not.toBeInTheDocument();
  } finally {
    vi.useRealTimers();
  }
});

test("does not add a completed session when persistence fails", async () => {
  focusTrackingApi.finishFocusSession.mockRejectedValueOnce(new Error("save failed"));

  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-07-07T13:00:00+08:00"));

  try {
    render(<PomodoroApp initialDurations={{ focus: 60, shortBreak: 300, longBreak: 900 }} />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByText("01:00")).toBeInTheDocument();

    act(() => {
      screen.getByRole("button", { name: "开始" }).click();
    });

    await act(async () => {
      vi.advanceTimersByTime(60000);
      await Promise.resolve();
    });

    expect(screen.getByText("保存失败")).toBeInTheDocument();

    act(() => {
      screen.getByRole("button", { name: /查看统计/i }).click();
    });
    expect(screen.getByText("还没有历史记录")).toBeInTheDocument();
  } finally {
    vi.useRealTimers();
  }
});

test("captures foreground samples once per second in strict mode", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-07-06T09:20:00+08:00"));

  try {
    render(
      <React.StrictMode>
        <PomodoroApp initialDurations={{ focus: 5, shortBreak: 300, longBreak: 900 }} />
      </React.StrictMode>,
    );
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByText("00:05")).toBeInTheDocument();

    act(() => {
      screen.getByRole("button", { name: "开始" }).click();
    });

    await act(async () => {
      vi.advanceTimersByTime(2000);
      await Promise.resolve();
    });

    expect(focusTrackingApi.captureFocusSample).toHaveBeenCalledTimes(2);
  } finally {
    vi.useRealTimers();
  }
});
