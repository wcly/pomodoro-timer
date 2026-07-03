import { ActionButton } from "../components/ActionButton";
import { UsageRow } from "../components/UsageRow";
import { buildSessionRangeLabel, formatDuration } from "../formatters";
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
          <p className="empty-state">未找到该专注记录</p>
          <ActionButton onClick={onBack}>返回</ActionButton>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <section className="page-frame">
        <h1 className="page-title">使用详情</h1>
        <div className="detail-hero">
          <span>{buildSessionRangeLabel(detail.session.startedAt, detail.session.endedAt)}</span>
          <strong>{formatDuration(detail.session.durationSeconds)}</strong>
        </div>
        <div className="usage-list">
          {detail.usage.map((row) => (
            <UsageRow key={`${row.bundleId}-${row.appName}`} row={row} />
          ))}
        </div>
        <ActionButton onClick={onBack}>返回</ActionButton>
      </section>
    </main>
  );
}
