import { ActionButton } from "../components/ActionButton";
import { ModeTabs, timerModeLabels } from "../components/ModeTabs";
import { formatClock } from "../formatters";
import type { TimerMode } from "../types";

interface TimerPageProps {
  currentMode: TimerMode;
  modeDuration: number;
  remainingSeconds: number;
  completedCount: number;
  isRunning: boolean;
  onChangeMode: (mode: TimerMode) => void;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onOpenStats: () => void;
}

export function TimerPage(props: TimerPageProps) {
  const elapsedRatio =
    props.modeDuration <= 0
      ? 0
      : (props.modeDuration - props.remainingSeconds) / props.modeDuration;

  return (
    <main className="app-shell app-shell--timer">
      <div className="timer-deco timer-deco--red" aria-hidden="true" />
      <div className="timer-deco timer-deco--yellow" aria-hidden="true" />
      <section className="page-frame timer-frame">
        <div className="status-badge">{timerModeLabels[props.currentMode]}</div>
        <ModeTabs
          currentMode={props.currentMode}
          disabled={props.isRunning}
          onSelectMode={props.onChangeMode}
        />
        <h1 className="timer-display">{formatClock(props.remainingSeconds)}</h1>
        <div className="timer-progress" aria-hidden="true">
          <div
            className="timer-progress__fill"
            style={{ width: `${Math.max(0, Math.min(elapsedRatio, 1)) * 100}%` }}
          />
        </div>
        <div className="action-row">
          <ActionButton emphasis="primary" onClick={props.onStart} disabled={props.isRunning}>
            开始
          </ActionButton>
          <ActionButton onClick={props.onPause} disabled={!props.isRunning}>
            暂停
          </ActionButton>
          <ActionButton onClick={props.onReset}>重置</ActionButton>
        </div>
        <p className="session-meta">
          <span className="session-meta__label">已完成：</span>
          <span className="session-meta__value">{props.completedCount}</span>
        </p>
        <ActionButton emphasis="ink" className="stats-link-button" onClick={props.onOpenStats}>
          <span>查看统计</span>
          <span className="stats-link-button__arrow" aria-hidden="true">
            →
          </span>
        </ActionButton>
      </section>
    </main>
  );
}
