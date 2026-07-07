import type { TimerMode } from "../types";

interface ModeTabsProps {
  currentMode: TimerMode;
  disabled?: boolean;
  onSelectMode?: (mode: TimerMode) => void;
}

export const timerModeLabels: Record<TimerMode, string> = {
  focus: "专注",
  shortBreak: "短休息",
  longBreak: "长休息",
};

export function ModeTabs({ currentMode, disabled = false, onSelectMode }: ModeTabsProps) {
  return (
    <div className="mode-tabs" aria-label="模式切换">
      {(Object.keys(timerModeLabels) as TimerMode[]).map((mode) => (
        <button
          key={mode}
          type="button"
          className={`mode-tab${mode === currentMode ? " mode-tab--active" : ""}`}
          aria-pressed={mode === currentMode}
          disabled={disabled}
          onClick={() => onSelectMode?.(mode)}
        >
          {timerModeLabels[mode]}
        </button>
      ))}
    </div>
  );
}
