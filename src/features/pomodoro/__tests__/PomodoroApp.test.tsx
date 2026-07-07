import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PomodoroApp } from "../PomodoroApp";

test("switches timer modes from the home page", async () => {
  const user = userEvent.setup();

  render(<PomodoroApp />);

  expect(screen.getByText("25:00")).toBeInTheDocument();
  expect(screen.getByText("专注", { selector: ".status-badge" })).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "短休息" }));
  expect(screen.getByText("短休息", { selector: ".status-badge" })).toBeInTheDocument();
  expect(screen.getByText("05:00")).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "长休息" }));
  expect(screen.getByText("长休息", { selector: ".status-badge" })).toBeInTheDocument();
  expect(screen.getByText("15:00")).toBeInTheDocument();
});

test("shows empty stats instead of hardcoded demo data on a fresh launch", async () => {
  const user = userEvent.setup();

  render(<PomodoroApp />);

  expect(screen.getByText("0", { selector: ".session-meta__value" })).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: /查看统计/i }));
  expect(screen.getByText("使用统计")).toBeInTheDocument();
  expect(screen.getByText("0m")).toBeInTheDocument();
  expect(screen.getByText("0", { selector: ".stat-card__value" })).toBeInTheDocument();
  expect(screen.getByText("还没有历史记录")).toBeInTheDocument();
});

test("records a finished focus session and exposes it in stats and detail", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-07-06T09:00:00+08:00"));

  try {
    render(<PomodoroApp initialDurations={{ focus: 60, shortBreak: 300, longBreak: 900 }} />);

    act(() => {
      screen.getByRole("button", { name: "开始" }).click();
    });

    act(() => {
      vi.advanceTimersByTime(60000);
    });

    expect(screen.getByText("1", { selector: ".session-meta__value" })).toBeInTheDocument();

    act(() => {
      screen.getByRole("button", { name: /查看统计/i }).click();
    });
    expect(screen.getByText("1m", { selector: ".stat-card__value" })).toBeInTheDocument();
    expect(screen.getByText("1", { selector: ".stat-card__value" })).toBeInTheDocument();

    act(() => {
      screen.getByRole("button", { name: /查看详情/i }).click();
    });

    expect(screen.getByText("使用详情")).toBeInTheDocument();
    expect(screen.queryByText("模式")).not.toBeInTheDocument();
    expect(screen.getByText("1m", { selector: ".detail-session-card__value" })).toBeInTheDocument();
    expect(screen.getByText("暂无应用使用数据")).toBeInTheDocument();
  } finally {
    vi.useRealTimers();
  }
});

test("records a finished short break in history and detail without affecting focus stats", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-07-06T10:00:00+08:00"));

  try {
    render(<PomodoroApp initialDurations={{ focus: 1500, shortBreak: 60, longBreak: 900 }} />);

    act(() => {
      screen.getByRole("button", { name: "短休息" }).click();
    });

    act(() => {
      screen.getByRole("button", { name: "开始" }).click();
    });

    act(() => {
      vi.advanceTimersByTime(60000);
    });

    expect(screen.getByText("0", { selector: ".session-meta__value" })).toBeInTheDocument();

    act(() => {
      screen.getByRole("button", { name: /查看统计/i }).click();
    });

    expect(screen.getByText("0m", { selector: ".stat-card__value" })).toBeInTheDocument();
    expect(screen.getByText("0", { selector: ".stat-card__value" })).toBeInTheDocument();
    expect(screen.getByText("短休息")).toBeInTheDocument();
    expect(screen.getByText("1m")).toBeInTheDocument();

    act(() => {
      screen.getByRole("button", { name: /查看详情/i }).click();
    });

    expect(screen.getByText("使用详情")).toBeInTheDocument();
    expect(screen.queryByText("模式")).not.toBeInTheDocument();
    expect(screen.getByText("1m", { selector: ".detail-session-card__value" })).toBeInTheDocument();
    expect(screen.getByText("暂无应用使用数据")).toBeInTheDocument();
  } finally {
    vi.useRealTimers();
  }
});

test("treats legacy sessions without a mode as focus sessions", async () => {
  const user = userEvent.setup();
  const legacySessionDetail = {
    session: {
      id: "legacy-focus-1",
      startedAt: "2026-07-06T11:59:00+08:00",
      endedAt: "2026-07-06T12:24:00+08:00",
      durationSeconds: 1500,
    },
    usage: [],
  } as unknown as NonNullable<
    NonNullable<Parameters<typeof PomodoroApp>[0]>["initialSessionDetails"]
  >[number];

  render(
    <PomodoroApp
      initialSessionDetails={[legacySessionDetail]}
      now={() => new Date("2026-07-06T13:00:00+08:00")}
    />,
  );

  await user.click(screen.getByRole("button", { name: /查看统计/i }));

  expect(screen.getByText("25m", { selector: ".stat-card__value" })).toBeInTheDocument();
  expect(screen.getByText("1", { selector: ".stat-card__value" })).toBeInTheDocument();
  expect(screen.getByText("专注", { selector: ".session-history-item__mode" })).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: /查看详情/i }));

  expect(screen.queryByText("模式")).not.toBeInTheDocument();
  expect(screen.getByText("25m", { selector: ".detail-session-card__value" })).toBeInTheDocument();
});
