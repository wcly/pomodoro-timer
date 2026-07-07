import React from "react";
import { act, render, screen } from "@testing-library/react";
import { PomodoroApp } from "../PomodoroApp";

const focusTrackingApi = vi.hoisted(() => ({
  startFocusSession: vi.fn().mockResolvedValue(undefined),
  pauseFocusSession: vi.fn().mockResolvedValue(undefined),
  resumeFocusSession: vi.fn().mockResolvedValue(undefined),
  resetFocusSession: vi.fn().mockResolvedValue(undefined),
  captureFocusSample: vi.fn().mockResolvedValue(undefined),
  finishFocusSession: vi.fn().mockResolvedValue([
    {
      bundleId: "com.microsoft.VSCode",
      appName: "VS Code",
      durationSeconds: 60,
      percentage: 1,
    },
  ]),
}));

vi.mock("../focusSessionApi", () => focusTrackingApi);

beforeEach(() => {
  focusTrackingApi.startFocusSession.mockClear();
  focusTrackingApi.pauseFocusSession.mockClear();
  focusTrackingApi.resumeFocusSession.mockClear();
  focusTrackingApi.resetFocusSession.mockClear();
  focusTrackingApi.captureFocusSample.mockClear();
  focusTrackingApi.finishFocusSession.mockClear();
  focusTrackingApi.finishFocusSession.mockResolvedValue([
    {
      bundleId: "com.microsoft.VSCode",
      appName: "VS Code",
      durationSeconds: 60,
      percentage: 1,
    },
  ]);
});

test("renders tracked app usage for a finished focus session", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-07-06T09:00:00+08:00"));

  try {
    render(<PomodoroApp initialDurations={{ focus: 60, shortBreak: 300, longBreak: 900 }} />);

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

test("renders tracked app usage for a finished short break session", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-07-06T09:12:00+08:00"));

  focusTrackingApi.finishFocusSession.mockResolvedValue([
    {
      bundleId: "com.apple.Music",
      appName: "Music",
      durationSeconds: 300,
      percentage: 1,
    },
  ]);

  try {
    render(<PomodoroApp initialDurations={{ focus: 1500, shortBreak: 300, longBreak: 900 }} />);

    act(() => {
      screen.getByRole("button", { name: "短休息" }).click();
    });

    act(() => {
      screen.getByRole("button", { name: "开始" }).click();
    });

    await act(async () => {
      vi.advanceTimersByTime(300000);
      await Promise.resolve();
    });

    act(() => {
      screen.getByRole("button", { name: /查看统计/i }).click();
    });

    act(() => {
      screen.getByRole("button", { name: /查看详情/i }).click();
    });

    expect(focusTrackingApi.finishFocusSession).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Music")).toBeInTheDocument();
    expect(screen.getByText("5m", { selector: ".usage-row__duration" })).toBeInTheDocument();
    expect(screen.getByText("100%", { selector: ".usage-row__percent" })).toBeInTheDocument();
    expect(screen.queryByText("暂无应用使用数据")).not.toBeInTheDocument();
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
