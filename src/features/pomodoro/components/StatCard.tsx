import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: ReactNode;
  accent?: boolean;
}

export function StatCard({ label, value, accent = false }: StatCardProps) {
  return (
    <article className={`stat-card${accent ? " stat-card--accent" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
