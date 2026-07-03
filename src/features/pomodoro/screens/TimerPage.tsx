import { ActionButton } from "../components/ActionButton";
import { ModeTabs } from "../components/ModeTabs";
import { formatClock } from "../formatters";
import type { TimerMode } from "../types";

interface TimerPageProps {
  currentMode: TimerMode;
  remainingSeconds: number;
  completedCount: number;
  currentAppName: string;
  isRunning?: boolean;
  onStart?: () => void;
  onPause?: () => void;
  onReset?: () => void;
  onOpenStats: () => void;
}

export function TimerPage(props: TimerPageProps) {
  return (
    <main className="app-shell">
      <section className="page-frame timer-page">
        <ModeTabs currentMode={props.currentMode} />
        <div className="status-badge">专注</div>
        <h1 className="timer-display">{formatClock(props.remainingSeconds)}</h1>
        <p className="current-app">当前记录：{props.currentAppName}</p>
        <div className="action-row">
          <ActionButton emphasis="primary" onClick={props.onStart}>
            开始
          </ActionButton>
          <ActionButton onClick={props.onPause}>暂停</ActionButton>
          <ActionButton onClick={props.onReset}>重置</ActionButton>
        </div>
        <p className="session-meta">已完成：{props.completedCount}</p>
        <ActionButton emphasis="ghost" onClick={props.onOpenStats}>
          查看统计
        </ActionButton>
      </section>
    </main>
  );
}
