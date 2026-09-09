"use client";

import { useState } from "react";
import { seriesColor } from "./palette";

export interface BarDatum {
  label: string;
  value: number;
  /** Secondary line under the label — a place, a count, whatever names the row further. */
  sublabel?: string;
}

/**
 * Horizontal bars for magnitude-by-identity (revenue per shop, orders per area). Horizontal
 * because the labels are names: rotated text under vertical bars is the single most common
 * unreadable thing in a dashboard.
 *
 * Every bar carries its value as text. That is what discharges the contrast warning on the
 * amber step — the number is never encoded in colour alone.
 */
export function BarChart({
  data,
  formatValue,
  colorIndex = 0,
  maxRows = 8,
}: {
  data: BarDatum[];
  formatValue: (v: number) => string;
  colorIndex?: number;
  maxRows?: number;
}) {
  const [hover, setHover] = useState<string | null>(null);

  const rows = data.slice(0, maxRows);
  if (rows.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Nothing to show yet.</p>;
  }

  const max = Math.max(...rows.map((r) => r.value), 1);
  const color = seriesColor(colorIndex);

  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((r) => (
        <div
          key={r.label}
          onMouseEnter={() => setHover(r.label)}
          onMouseLeave={() => setHover(null)}
          className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3"
        >
          <div className="min-w-0">
            <p className="truncate text-xs font-medium">{r.label}</p>
            {r.sublabel && <p className="truncate text-[11px] text-muted-foreground">{r.sublabel}</p>}
          </div>
          <div className="h-5 overflow-hidden rounded bg-muted">
            <div
              className="h-full rounded-r transition-[width] duration-300"
              style={{
                width: `${Math.max((r.value / max) * 100, r.value > 0 ? 2 : 0)}%`,
                backgroundColor: color,
                opacity: hover && hover !== r.label ? 0.55 : 1,
              }}
            />
          </div>
          <span className="text-xs font-semibold tabular-nums">{formatValue(r.value)}</span>
        </div>
      ))}
    </div>
  );
}
