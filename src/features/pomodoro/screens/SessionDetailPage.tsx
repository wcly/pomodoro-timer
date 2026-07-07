import { ActionButton } from "../components/ActionButton";
import { timerModeLabels } from "../components/ModeTabs";
import { UsageRow } from "../components/UsageRow";
import { buildSessionRangeLabel, formatDuration } from "../formatters";
import { normalizeTimerMode } from "../types";
import type { SessionDetail } from "../types";

interface SessionDetailPageProps {
  detail: SessionDetail | null;
  onBack: () => void;
}

export function SessionDetailPage({ detail, onBack }: SessionDetailPageProps) {
  if (detail === null) {
    return (
      <main className="app-shell">
        <section className="page-frame">
          <h1 className="page-title">使用详情</h1>
          <p className="empty-state">未找到该记录</p>
          <ActionButton onClick={onBack}>返回</ActionButton>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell app-shell--sheet app-shell--detail">
      <div className="sheet-deco sheet-deco--detail-accent" aria-hidden="true" />
      <div className="sheet-deco sheet-deco--detail-ink" aria-hidden="true" />
      <section className="page-frame detail-frame">
        <h1 className="page-title page-title--detail">使用详情</h1>
        <div className="detail-session-card">
          <div className="detail-session-card__column">
            <span className="detail-session-card__label">时段</span>
            <strong className="detail-session-card__value">
              {buildSessionRangeLabel(detail.session.startedAt, detail.session.endedAt)}
            </strong>
          </div>
          <div className="detail-session-card__column">
            <span className="detail-session-card__label">总时长</span>
            <strong className="detail-session-card__value">
              {formatDuration(detail.session.durationSeconds)}
            </strong>
          </div>
          <div className="detail-session-card__column">
            <span className="detail-session-card__label">模式</span>
            <strong className="detail-session-card__value">
              {timerModeLabels[normalizeTimerMode(detail.session.mode)]}
            </strong>
          </div>
        </div>
        <div className="detail-columns" aria-hidden="true">
          <span>应用</span>
          <span>时长</span>
          <span>占比</span>
        </div>
        <div className="usage-list usage-list--detailed">
          {detail.usage.length === 0 ? (
            <p className="empty-state">暂无应用使用数据</p>
          ) : (
            detail.usage.map((row) => (
              <UsageRow
                key={`${row.bundleId}-${row.appName}`}
                row={row}
                variant="framed"
              />
            ))
          )}
        </div>
        <div className="detail-actions">
          <ActionButton emphasis="ink" className="back-button" onClick={onBack}>
            <span className="back-button__arrow" aria-hidden="true">
              ←
            </span>
            <span>返回</span>
          </ActionButton>
        </div>
      </section>
    </main>
  );
}
