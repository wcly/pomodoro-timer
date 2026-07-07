import { buildSessionRangeLabel } from "../formatters";
import { normalizeTimerMode } from "../sessionMode";
import type { SessionHistoryItemViewModel } from "../types";
import { timerModeLabels } from "./ModeTabs";

interface SessionHistoryItemProps {
  item: SessionHistoryItemViewModel;
  onOpen: (sessionId: string) => void;
}

export function SessionHistoryItem({ item, onOpen }: SessionHistoryItemProps) {
  const mode = normalizeTimerMode(item.session.mode);
  const isFocus = mode === "focus";
  const modeLabel = item.modeLabel || timerModeLabels[mode];

  return (
    <button
      type="button"
      className="session-history-item"
      aria-label={`查看详情 ${item.calendarLabel}`}
      onClick={() => onOpen(item.session.id)}
    >
      <div className="session-history-item__info">
        <strong className="session-history-item__date">{item.calendarLabel}</strong>
        <p className="session-history-item__time">
          {buildSessionRangeLabel(item.session.startedAt, item.session.endedAt)}
        </p>
      </div>
      <div className="session-history-item__meta">
        <span
          className={`session-history-item__mode${
            isFocus ? " session-history-item__mode--focus" : ""
          }`}
        >
          {modeLabel}
        </span>
        <strong className="session-history-item__duration">{item.durationLabel}</strong>
        <span className="session-history-item__arrow" aria-hidden="true">
          →
        </span>
      </div>
    </button>
  );
}
