import type { ReactNode } from 'react';

/** Validated categorical order (dataviz validator: light surface, all checks pass). Never cycle. */
export const SERIES = ['#0f9a6e', '#2f6fd0', '#e0782c', '#7c5cd6', '#d4568a'];

export const AXIS = {
  tick: { fontSize: 11, fill: 'rgba(31,42,36,0.55)' },
  axisLine: false,
  tickLine: false,
} as const;

export const GRID = { stroke: 'rgba(31,42,36,0.07)', vertical: false } as const;

export function ChartTooltip({
  active,
  payload,
  label,
  format,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string }[];
  label?: ReactNode;
  format: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-white shadow-lift border border-black/[0.06] px-3 py-2 text-xs">
      <p className="font-semibold text-ink mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 text-ink/70">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: p.color }} />
          {p.name}: <b className="text-ink">{format(p.value ?? 0)}</b>
        </p>
      ))}
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-ink/60">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}
