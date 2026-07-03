import { ActionButton } from "../components/ActionButton";
import { UsageRow } from "../components/UsageRow";
import { buildSessionRangeLabel, formatDuration } from "../formatters";
import type { SessionDetail } from "../types";

interface SessionDetailPageProps {
  detail: SessionDetail;
  onBack: () => void;
}

export function SessionDetailPage({ detail, onBack }: SessionDetailPageProps) {
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
