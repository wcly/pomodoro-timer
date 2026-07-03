import { buildSessionRangeLabel, formatDuration } from "../formatters";
import type { SessionSummary } from "../types";
import { ActionButton } from "./ActionButton";

interface SessionHistoryItemProps {
  session: SessionSummary;
  onOpen: (sessionId: string) => void;
}

export function SessionHistoryItem({ session, onOpen }: SessionHistoryItemProps) {
  return (
    <article className="session-history-item">
      <div>
        <strong>{buildSessionRangeLabel(session.startedAt, session.endedAt)}</strong>
        <p>{formatDuration(session.durationSeconds)}</p>
      </div>
      <ActionButton emphasis="ghost" onClick={() => onOpen(session.id)}>
        查看详情
      </ActionButton>
    </article>
  );
}
