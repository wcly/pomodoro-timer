import type { TimerMode } from "../types";

interface ModeTabsProps {
  currentMode: TimerMode;
}

const labels: Record<TimerMode, string> = {
  focus: "专注",
  shortBreak: "短休息",
  longBreak: "长休息",
};

export function ModeTabs({ currentMode }: ModeTabsProps) {
  return (
    <div className="mode-tabs" aria-label="模式切换">
      {(Object.keys(labels) as TimerMode[]).map((mode) => (
        <button
          key={mode}
          type="button"
          className={`mode-tab${mode === currentMode ? " mode-tab--active" : ""}`}
          aria-pressed={mode === currentMode}
        >
          {labels[mode]}
        </button>
      ))}
    </div>
  );
}
