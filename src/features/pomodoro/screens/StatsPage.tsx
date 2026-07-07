import { SessionHistoryItem } from "../components/SessionHistoryItem";
import { StatCard } from "../components/StatCard";
import { ActionButton } from "../components/ActionButton";
import { formatDuration } from "../formatters";
import type { SessionHistoryItemViewModel, TodayStats } from "../types";

interface StatsPageProps {
  todayStats: TodayStats;
  historyItems: SessionHistoryItemViewModel[];
  onBack: () => void;
  onOpenSession: (sessionId: string) => void;
}

export function StatsPage(props: StatsPageProps) {
  return (
    <main className="app-shell app-shell--sheet app-shell--stats">
      <div className="sheet-deco sheet-deco--stats-red" aria-hidden="true" />
      <div className="sheet-deco sheet-deco--stats-ink" aria-hidden="true" />
      <section className="page-frame sheet-frame sheet-frame--stats">
        <div className="sheet-content sheet-content--stats">
          <h1 className="page-title page-title--stats">使用统计</h1>
          <div className="stats-grid">
            <StatCard
              label="今日专注"
              value={formatDuration(props.todayStats.totalFocusSeconds)}
              tone="ink"
            />
            <StatCard label="完成番茄" value={props.todayStats.completedCount} tone="signal" />
          </div>
          <div className="history-header">
            <span>历史记录</span>
            <span>{props.historyItems.length} 条记录</span>
          </div>
          <div className="session-list">
            {props.historyItems.length === 0 ? (
              <p className="empty-state">还没有历史记录</p>
            ) : (
              props.historyItems.map((item) => (
                <SessionHistoryItem
                  key={item.session.id}
                  item={item}
                  onOpen={props.onOpenSession}
                />
              ))
            )}
          </div>
        </div>
        <div className="sheet-footer sheet-footer--stats">
          <ActionButton emphasis="ink" className="back-button" onClick={props.onBack}>
            <span className="back-button__arrow" aria-hidden="true">
              ←
            </span>
            <span>返回主页</span>
          </ActionButton>
        </div>
      </section>
    </main>
  );
}
