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

const LABELS = ["15 Oct", "Nov '25", "15 Nov", "Dec '25", "15 Dec", "Jan '26", "15 Jan", "Feb '26", "15 Feb", "Mar '26", "15 Mar", "Hiện tại"];
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
  const [activeIndex, setActiveIndex] = useState<number | null>(data.length - 1);

  const width = 1200;
  const height = 360;
  const padding = { top: 28, right: 24, bottom: 56, left: 52 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const yMin = 0.25;
  const yMax = 0.65;
  const ticks = [0.25, 0.35, 0.45, 0.55, 0.65];

  const xAt = (index: number) => padding.left + (index * chartWidth) / Math.max(data.length - 1, 1);
  const yAt = (value: number) => padding.top + ((yMax - value) * chartHeight) / (yMax - yMin);

  const activePoint = activeIndex === null ? null : data[activeIndex];
  const activeX = activeIndex === null ? null : xAt(activeIndex);

  return (
    <div className="area-trend-chart-shell">
      <div className="area-trend-chart-toolbar">
        <div className="area-trend-chart-badges">
          {series.map((item) => (
            <span key={item.key} className="area-trend-badge">
              <i style={{ backgroundColor: item.color }} />{item.label}
            </span>
          ))}
        </div>
        {activePoint && (
          <div className="area-trend-tooltip-inline">
            <strong>{String(activePoint.label)}</strong>
            <div>
              {series.map((item) => (
                <span key={item.key}>
                  <i style={{ backgroundColor: item.color }} /> {item.key}: {Number(activePoint[item.key]).toFixed(2)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <svg className="area-trend-chart" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        {ticks.map((tick) => (
          <g key={tick}>
            <line className="grid" x1={padding.left} y1={yAt(tick)} x2={width - padding.right} y2={yAt(tick)} />
            <text className="tick-y" x={padding.left - 12} y={yAt(tick) + 4} textAnchor="end">{tick.toFixed(2)}</text>
          </g>
        ))}

        {data.map((point, index) => (
          <g key={String(point.label)}>
            <rect
              x={xAt(index) - chartWidth / data.length / 2}
              y={padding.top}
              width={chartWidth / data.length}
              height={chartHeight}
              fill="transparent"
              onMouseEnter={() => setActiveIndex(index)}
            />
            <text className="tick-x" x={xAt(index)} y={height - 18} textAnchor="middle">{String(point.label)}</text>
          </g>
        ))}

        {activeX !== null && <line className="active-line" x1={activeX} y1={padding.top} x2={activeX} y2={height - padding.bottom} />}

        {series.map((item) => {
          const path = data.map((point, index) => `${index === 0 ? "M" : "L"}${xAt(index)},${yAt(Number(point[item.key]))}`).join(" ");
          return <path key={item.key} d={path} fill="none" stroke={item.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />;
        })}

        {series.map((item) =>
          data.map((point, index) => (
            <circle key={`${item.key}-${index}`} cx={xAt(index)} cy={yAt(Number(point[item.key]))} r={activeIndex === index ? 5 : 3.5} fill={item.color} stroke="#fff" strokeWidth="2" />
          ))
        )}
      </svg>
    </div>
  );
}
