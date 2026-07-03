import type { TimerMode } from "../types";

interface ModeTabsProps {
  currentMode: TimerMode;
}

export const timerModeLabels: Record<TimerMode, string> = {
  focus: "专注",
  shortBreak: "短休息",
  longBreak: "长休息",
};

export function ModeTabs({ currentMode }: ModeTabsProps) {
  return (
    <div className="mode-tabs" aria-label="模式切换">
      {(Object.keys(timerModeLabels) as TimerMode[]).map((mode) => (
        <button
          key={mode}
          type="button"
          className={`mode-tab${mode === currentMode ? " mode-tab--active" : ""}`}
          aria-pressed={mode === currentMode}
        >
          {timerModeLabels[mode]}
        </button>
      ))}
    </div>
  );
}
