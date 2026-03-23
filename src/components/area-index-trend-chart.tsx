"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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
  const totalPoints = data.length;
  const minWindow = Math.min(4, totalPoints || 1);
  const [windowSize, setWindowSize] = useState(totalPoints);
  const [startIndex, setStartIndex] = useState(0);
  const [activeIndex, setActiveIndex] = useState<number | null>(totalPoints ? totalPoints - 1 : null);
  const dragState = useRef<{ pointerId: number; startX: number; originStart: number } | null>(null);

  useEffect(() => {
    setWindowSize(totalPoints);
    setStartIndex(0);
    setActiveIndex(totalPoints ? totalPoints - 1 : null);
  }, [totalPoints, seed]);

  const visibleCount = Math.max(minWindow, Math.min(windowSize, totalPoints || minWindow));
  const maxStart = Math.max(0, totalPoints - visibleCount);
  const safeStart = Math.min(startIndex, maxStart);
  const visibleData = data.slice(safeStart, safeStart + visibleCount);
  const activePoint = activeIndex === null ? null : data[activeIndex] ?? null;
  const activeVisibleIndex = activeIndex === null ? -1 : activeIndex - safeStart;

  const width = 1200;
  const height = 420;
  const padding = { top: 24, right: 24, bottom: 64, left: 58 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const yMin = 0.25;
  const yMax = 0.75;
  const ticks = [0.25, 0.35, 0.45, 0.55, 0.65, 0.75];
  const segmentCount = Math.max(visibleData.length - 1, 1);
  const bandWidth = chartWidth / Math.max(visibleData.length, 1);

  const xAt = (index: number) => padding.left + (index * chartWidth) / segmentCount;
  const yAt = (value: number) => padding.top + ((yMax - value) * chartHeight) / (yMax - yMin);

  const zoomIn = () => {
    if (visibleCount <= minWindow) return;
    const nextSize = Math.max(minWindow, visibleCount - 2);
    const nextMaxStart = Math.max(0, totalPoints - nextSize);
    const centered = Math.min(nextMaxStart, Math.max(0, safeStart + Math.floor((visibleCount - nextSize) / 2)));
    setWindowSize(nextSize);
    setStartIndex(centered);
  };

  const zoomOut = () => {
    if (visibleCount >= totalPoints) return;
    const nextSize = Math.min(totalPoints, visibleCount + 2);
    const nextMaxStart = Math.max(0, totalPoints - nextSize);
    const centered = Math.min(nextMaxStart, Math.max(0, safeStart - Math.floor((nextSize - visibleCount) / 2)));
    setWindowSize(nextSize);
    setStartIndex(centered);
  };

  const panBy = (delta: number) => setStartIndex((current) => Math.max(0, Math.min(maxStart, current + delta)));

  const handlePointerDown = (event: React.PointerEvent<SVGRectElement>) => {
    dragState.current = { pointerId: event.pointerId, startX: event.clientX, originStart: safeStart };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<SVGRectElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const relativeX = Math.min(Math.max(event.clientX - bounds.left, 0), bounds.width);
    const hoveredIndex = Math.min(visibleData.length - 1, Math.max(0, Math.round((relativeX / Math.max(bounds.width, 1)) * segmentCount)));
    setActiveIndex(safeStart + hoveredIndex);

    const drag = dragState.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.startX;
    const steps = Math.round(deltaX / Math.max(bandWidth * 0.75, 1));
    setStartIndex(Math.max(0, Math.min(maxStart, drag.originStart - steps)));
  };

  const handlePointerUp = (event: React.PointerEvent<SVGRectElement>) => {
    if (dragState.current?.pointerId === event.pointerId) {
      dragState.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const activeX = activeVisibleIndex >= 0 && activeVisibleIndex < visibleData.length ? xAt(activeVisibleIndex) : null;

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

        <div className="area-trend-chart-actions" aria-label="Điều khiển biểu đồ">
          <button type="button" onClick={() => panBy(-1)} disabled={safeStart === 0}>← Trái</button>
          <button type="button" onClick={() => panBy(1)} disabled={safeStart >= maxStart}>Phải →</button>
          <button type="button" onClick={zoomOut} disabled={visibleCount >= totalPoints}>− Thu nhỏ</button>
          <button type="button" onClick={zoomIn} disabled={visibleCount <= minWindow}>+ Phóng to</button>
          <span className="area-trend-chart-window">{safeStart + 1}-{Math.min(safeStart + visibleCount, totalPoints)}/{totalPoints}</span>
        </div>
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

      <div className="area-trend-chart-hint">Kéo ngang trong vùng biểu đồ để di chuyển, hoặc dùng các nút phóng to / thu nhỏ.</div>

      <svg className="area-trend-chart" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Biểu đồ xu hướng chỉ số khu vực">
        <defs>
          <clipPath id="area-trend-clip">
            <rect x={padding.left} y={padding.top} width={chartWidth} height={chartHeight} rx="18" />
          </clipPath>
        </defs>

        <rect className="chart-surface" x={padding.left} y={padding.top} width={chartWidth} height={chartHeight} rx="18" />

        {ticks.map((tick) => (
          <g key={tick}>
            <line className="grid" x1={padding.left} y1={yAt(tick)} x2={width - padding.right} y2={yAt(tick)} />
            <text className="tick-y" x={padding.left - 12} y={yAt(tick) + 4} textAnchor="end">{tick.toFixed(2)}</text>
          </g>
        ))}

        {visibleData.map((point, index) => (
          <g key={String(point.label)}>
            <line className="grid-vertical" x1={xAt(index)} y1={padding.top} x2={xAt(index)} y2={height - padding.bottom} />
            <text className="tick-x" x={xAt(index)} y={height - 22} textAnchor="middle">{String(point.label)}</text>
          </g>
        ))}

        <rect
          x={padding.left}
          y={padding.top}
          width={chartWidth}
          height={chartHeight}
          className="drag-layer"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />

        {activeX !== null && <line className="active-line" x1={activeX} y1={padding.top} x2={activeX} y2={height - padding.bottom} />}

        <g clipPath="url(#area-trend-clip)">
          {series.map((item) => {
            const path = visibleData
              .map((point, index) => `${index === 0 ? "M" : "L"}${xAt(index)},${yAt(Number(point[item.key]))}`)
              .join(" ");
            return <path key={item.key} className="trend-line" d={path} fill="none" stroke={item.color} />;
          })}

          {series.map((item) =>
            visibleData.map((point, index) => (
              <circle
                key={`${item.key}-${safeStart + index}`}
                cx={xAt(index)}
                cy={yAt(Number(point[item.key]))}
                r={activeVisibleIndex === index ? 5.5 : 4}
                fill={item.color}
                stroke="#ffffff"
                strokeWidth="2.5"
              />
            ))
          )}
        </g>
      </svg>
    </div>
  );
}
