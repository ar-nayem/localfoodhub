"use client";

import { useState } from "react";
import { seriesColor } from "./palette";

export interface LinePoint {
  label: string;
  value: number;
}

/**
 * Single-series time chart. One series means no legend box — the title names it, per the
 * accessibility rule — but the crosshair and tooltip are not optional: an SVG chart in a
 * browser is interactive by default, and a bare shape with no way to read a value is a
 * picture, not a chart.
 */
export function LineChart({
  points,
  formatValue,
  height = 200,
  colorIndex = 0,
}: {
  points: LinePoint[];
  formatValue: (v: number) => string;
  height?: number;
  colorIndex?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);

  if (points.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No data for this period yet.</p>;
  }

  const width = 720;
  const pad = { top: 12, right: 12, bottom: 26, left: 52 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const max = Math.max(...points.map((p) => p.value), 1);
  // Always anchored at zero: a truncated baseline exaggerates every change above it.
  const x = (i: number) => pad.left + (points.length === 1 ? plotW / 2 : (i / (points.length - 1)) * plotW);
  const y = (v: number) => pad.top + plotH - (v / max) * plotH;

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.value)}`).join(" ");
  const areaPath = `${path} L ${x(points.length - 1)} ${pad.top + plotH} L ${x(0)} ${pad.top + plotH} Z`;
  const stroke = seriesColor(colorIndex);
  const ticks = [0, 0.5, 1].map((f) => Math.round(max * f));

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img">
        {ticks.map((t) => (
          <g key={t}>
            {/* Recessive grid — present enough to read a value against, never competing
                with the data mark itself. */}
            <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} stroke="currentColor" strokeOpacity={0.12} />
            <text x={pad.left - 8} y={y(t) + 4} textAnchor="end" className="fill-current text-[10px] opacity-60">
              {formatValue(t)}
            </text>
          </g>
        ))}

        <path d={areaPath} fill={stroke} fillOpacity={0.1} />
        <path d={path} fill="none" stroke={stroke} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {hover !== null && (
          <line
            x1={x(hover)}
            x2={x(hover)}
            y1={pad.top}
            y2={pad.top + plotH}
            stroke="currentColor"
            strokeOpacity={0.25}
            strokeDasharray="3 3"
          />
        )}
        {hover !== null && <circle cx={x(hover)} cy={y(points[hover].value)} r={4.5} fill={stroke} stroke="white" strokeWidth={2} />}

        {points.map((p, i) => (
          // Hit targets are a full column wide, not the 2px line — pointing at a thin
          // stroke on a touchscreen is not a real interaction.
          <rect
            key={p.label}
            x={x(i) - plotW / points.length / 2}
            y={pad.top}
            width={plotW / points.length}
            height={plotH}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          />
        ))}

        {points.map((p, i) => {
          const isFirst = i === 0;
          const isLast = i === points.length - 1;
          if (!isFirst && !isLast && i !== Math.floor(points.length / 2)) return null;
          // End labels anchor inward — centering them on the first and last point pushes
          // half the text outside the viewBox, which clips it.
          return (
            <text
              key={p.label}
              x={x(i)}
              y={height - 8}
              textAnchor={isFirst ? "start" : isLast ? "end" : "middle"}
              className="fill-current text-[10px] opacity-60"
            >
              {p.label}
            </text>
          );
        })}
      </svg>

      {hover !== null && (
        <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs shadow-lg">
          <span className="font-semibold">{points[hover].label}</span>
          <span className="ml-2">{formatValue(points[hover].value)}</span>
        </div>
      )}
    </div>
  );
}
