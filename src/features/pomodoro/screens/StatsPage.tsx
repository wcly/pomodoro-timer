import { ActionButton } from "../components/ActionButton";
import { SessionHistoryItem } from "../components/SessionHistoryItem";
import { StatCard } from "../components/StatCard";
import { formatDuration } from "../formatters";
import type { SessionSummary, TodayStats } from "../types";

interface StatsPageProps {
  todayStats: TodayStats;
  sessions: SessionSummary[];
  onBack: () => void;
  onOpenSession: (sessionId: string) => void;
}

export function StatsPage(props: StatsPageProps) {
  return (
    <main className="app-shell">
      <section className="page-frame">
        <h1 className="page-title">使用统计</h1>
        <div className="stats-grid">
          <StatCard
            label="今日专注"
            value={formatDuration(props.todayStats.totalFocusSeconds)}
          />
          <StatCard label="完成番茄" value={props.todayStats.completedCount} accent />
        </div>
        <div className="session-list">
          {props.sessions.length === 0 ? (
            <p className="empty-state">还没有专注记录</p>
          ) : (
            props.sessions.map((session) => (
              <SessionHistoryItem
                key={session.id}
                session={session}
                onOpen={props.onOpenSession}
              />
            ))
          )}
        </div>
        <ActionButton onClick={props.onBack}>返回主页</ActionButton>
      </section>
    </main>
  );
}
