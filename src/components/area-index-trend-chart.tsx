"use client";

import { useMemo, useState } from "react";

type SeriesItem = {
  key: string;
  label: string;
  color: string;
  value: number;
};

type Props = {
  series: SeriesItem[];
  seed: string;
};

type Point = {
  label: string;
  [key: string]: string | number;
};

const LABELS = ["15 Th10", "Th11/25", "15 Th11", "Th12/25", "15 Th12", "Th1/26", "15 Th1", "Th2/26", "15 Th2", "Th3/26", "15 Th3", "Hiện tại"];
const clamp = (value: number, min = 0.2, max = 0.9) => Math.max(min, Math.min(max, value));

function seedFromText(text: string) {
  return text.split("").reduce((acc, ch, index) => acc + ch.charCodeAt(0) * (index + 1), 0);
}

function buildTrend(series: SeriesItem[], seed: string): Point[] {
  const seedValue = seedFromText(seed);
  return LABELS.map((label, index) => {
    const row: Point = { label };
    series.forEach((item, seriesIndex) => {
      const waveA = Math.sin((seedValue + index * 13 + seriesIndex * 17) / 11) * 0.035;
      const waveB = Math.cos((seedValue + index * 7 + seriesIndex * 5) / 9) * 0.022;
      row[item.key] = Number(clamp(item.value + waveA + waveB).toFixed(2));
    });
    return row;
  });
}

export default function AreaIndexTrendChart({ series, seed }: Props) {
  const data = useMemo(() => buildTrend(series, seed), [seed, series]);
  const [hoverIndex, setHoverIndex] = useState<number | null>(data.length > 0 ? data.length - 1 : null);

  const width = 1200;
  const height = 300;
  const padding = { top: 16, right: 24, bottom: 54, left: 46 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const yMin = 0.25;
  const yMax = 0.65;
  const ticks = [0.25, 0.35, 0.45, 0.55, 0.65];

  const xAt = (index: number) => {
    const segments = Math.max(data.length - 1, 1);
    return padding.left + (index * chartWidth) / segments;
  };
  const yAt = (value: number) => padding.top + ((yMax - value) * chartHeight) / (yMax - yMin);

  const handleMove = (clientX: number, box: DOMRect) => {
    if (!data.length) return;
    const relativeX = Math.max(0, Math.min(box.width, clientX - box.left));
    const idx = Math.round((relativeX / Math.max(box.width, 1)) * (data.length - 1));
    setHoverIndex(Math.max(0, Math.min(data.length - 1, idx)));
  };

  const activePoint = hoverIndex === null ? null : data[hoverIndex] ?? null;
  const activeX = hoverIndex === null ? null : xAt(hoverIndex);

  return (
    <div className="area-trend-lite">
      <div className="area-trend-lite-chart-wrap" onMouseMove={(e) => handleMove(e.clientX, e.currentTarget.getBoundingClientRect())} onMouseLeave={() => setHoverIndex(null)}>
        <svg className="area-trend-chart" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label="Biểu đồ xu hướng chỉ số khu vực">
          {ticks.map((tick) => (
            <g key={tick}>
              <line className="grid" x1={padding.left} y1={yAt(tick)} x2={width - padding.right} y2={yAt(tick)} />
              <text className="tick-y" x={padding.left - 8} y={yAt(tick) + 4} textAnchor="end">{tick.toFixed(2)}</text>
            </g>
          ))}

          {data.map((point, index) => (
            <text key={String(point.label)} className="tick-x" x={xAt(index)} y={height - 18} textAnchor="middle">{String(point.label)}</text>
          ))}

          {activeX !== null && <line className="active-line" x1={activeX} y1={padding.top} x2={activeX} y2={height - padding.bottom} />}

          {series.map((item) => {
            const path = data.map((point, index) => `${index === 0 ? "M" : "L"}${xAt(index)},${yAt(Number(point[item.key]))}`).join(" ");
            return <path key={item.key} className="trend-line" d={path} fill="none" stroke={item.color} />;
          })}

          {hoverIndex !== null && series.map((item) => (
            <circle
              key={`${item.key}-${hoverIndex}`}
              cx={xAt(hoverIndex)}
              cy={yAt(Number(data[hoverIndex]?.[item.key]))}
              r="4.3"
              fill={item.color}
              stroke="#fff"
              strokeWidth="2"
            />
          ))}
        </svg>

        {activePoint && activeX !== null && (
          <div className="area-trend-tooltip-inline" style={{ left: `${(activeX / width) * 100}%` }}>
            <strong>{String(activePoint.label)}</strong>
            <div>
              {series.map((item) => (
                <span key={`${item.key}-tip`}><i style={{ backgroundColor: item.color }} />{item.key}: {Number(activePoint[item.key]).toFixed(2)}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="area-trend-chart-badges">
        {series.map((item) => (
          <span key={item.key} className="area-trend-badge"><i style={{ backgroundColor: item.color }} />{item.label}</span>
        ))}
      </div>
    </div>
  );
}
