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
  mode: TimerMode;
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

export interface SessionHistoryItemViewModel {
  session: SessionSummary;
  calendarLabel: string;
  modeLabel: string;
  durationLabel: string;
}

export interface BootstrapState {
  durations: TimerDurations;
  todayStats: TodayStats;
  sessions: SessionSummary[];
}
