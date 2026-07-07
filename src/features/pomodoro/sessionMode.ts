import type { TimerMode } from "./types";

export function normalizeTimerMode(value: unknown): TimerMode {
  if (value === "focus" || value === "shortBreak" || value === "longBreak") {
    return value;
  }

  return "focus";
}
