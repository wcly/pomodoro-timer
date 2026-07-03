import { formatDuration, formatPercent } from "../formatters";
import type { SessionUsageRow } from "../types";

interface UsageRowProps {
  row: SessionUsageRow;
}

export function UsageRow({ row }: UsageRowProps) {
  return (
    <article className="usage-row">
      <div>
        <strong>{row.appName}</strong>
        <p>{formatDuration(row.durationSeconds)}</p>
      </div>
      <strong>{formatPercent(row.percentage)}</strong>
    </article>
  );
}
