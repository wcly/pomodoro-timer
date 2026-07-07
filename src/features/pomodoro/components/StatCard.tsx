import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: ReactNode;
  tone?: "ink" | "signal";
}

export function StatCard({ label, value, tone = "ink" }: StatCardProps) {
  return (
    <article className={`stat-card stat-card--${tone}`}>
      <span className="stat-card__label">{label}</span>
      <strong className="stat-card__value">{value}</strong>
    </article>
  );
}
