import type { CSSProperties } from "react";
import { formatPercent } from "../formatters";
import type { SessionUsageRow } from "../types";

interface UsageRowProps {
  row: SessionUsageRow;
  variant?: "plain" | "framed";
}

function formatUsageDuration(totalSeconds: number): string {
  const minutes = totalSeconds / 60;
  const roundedMinutes = minutes.toFixed(1);

  if (totalSeconds > 0 && roundedMinutes === "0.0") {
    return "<0.1m";
  }

  return Number.isInteger(minutes) ? `${minutes}m` : `${roundedMinutes}m`;
}

function hashUsageSeed(seed: string): number {
  let hash = 0;

  for (const character of seed) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return hash;
}

function buildUsageAccent(bundleId: string, appName: string): string {
  const seed = [bundleId, appName].filter(Boolean).join(":");
  const hue = hashUsageSeed(seed) % 360;

  return `hsl(${hue} 58% 38%)`;
}

export function UsageRow({ row, variant = "plain" }: UsageRowProps) {
  const className = ["usage-row", `usage-row--${variant}`].join(" ");
  const usageStyle = {
    "--usage-accent": buildUsageAccent(row.bundleId, row.appName),
  } as CSSProperties;

  return (
    <article className={className} style={usageStyle}>
      <div className="usage-row__top">
        <div className="usage-row__app">
          <span className="usage-row__swatch" aria-hidden="true" />
          <strong className="usage-row__name">{row.appName}</strong>
        </div>
        <strong className="usage-row__duration">{formatUsageDuration(row.durationSeconds)}</strong>
        <strong className="usage-row__percent">{formatPercent(row.percentage)}</strong>
      </div>
      <div className="usage-row__bar" aria-hidden="true">
        <div
          className="usage-row__fill"
          style={{ width: `${Math.max(row.percentage * 100, 3)}%` }}
        />
      </div>
    </article>
  );
}
