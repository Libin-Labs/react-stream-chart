import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import {
  getDomains,
  isFinitePoint,
  nearestPoint,
  scale,
  type Domain,
  type Point,
  type Series,
} from './model.js';

export * from './model.js';

export interface TooltipEntry {
  series: Series;
  point: Point;
}

export interface StreamChartProps {
  series: readonly Series[];
  height?: number;
  xDomain?: Domain;
  yDomain?: Domain;
  maxPoints?: number;
  axes?: boolean;
  tooltip?: boolean;
  label?: string;
  className?: string;
  style?: CSSProperties;
  formatX?: (value: number) => string;
  formatY?: (value: number) => string;
  renderTooltip?: (entries: readonly TooltipEntry[]) => ReactNode;
}

const colors = ['#2563eb', '#dc2626', '#059669', '#9333ea', '#d97706'];
const formatNumber = (value: number) => Number(value.toPrecision(4)).toString();

export function StreamChart({
  series,
  height = 260,
  xDomain,
  yDomain,
  maxPoints,
  axes = true,
  tooltip = false,
  label = 'Line chart',
  className = '',
  style,
  formatX = formatNumber,
  formatY = formatNumber,
  renderTooltip,
}: StreamChartProps) {
  if (!Number.isFinite(height) || height <= 0) throw new RangeError('height must be positive');
  if (maxPoints !== undefined && (!Number.isInteger(maxPoints) || maxPoints < 1)) {
    throw new RangeError('maxPoints must be a positive integer');
  }
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ width: 0, dpr: 1 });
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);
  const visible = useMemo(
    () =>
      series.map((line) => ({
        ...line,
        data: maxPoints === undefined ? line.data : line.data.slice(-maxPoints),
      })),
    [series, maxPoints],
  );
  const domains = useMemo(
    () => getDomains(visible, { x: xDomain, y: yDomain }),
    [visible, xDomain, yDomain],
  );
  const left = axes ? 58 : 8;
  const right = Math.max(left + 1, size.width - 16);
  const top = 14;
  const bottom = Math.max(top + 1, height - (axes ? 32 : 8));

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const measure = () =>
      setSize({
        width: Math.max(0, element.getBoundingClientRect().width),
        dpr: Math.max(1, window.devicePixelRatio || 1),
      });
    measure();
    const observer =
      typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure);
    observer?.observe(element);
    window.addEventListener('resize', measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  useEffect(() => {
    const element = canvas.current;
    if (!element || size.width <= 0) return;
    element.width = Math.round(size.width * size.dpr);
    element.height = Math.round(height * size.dpr);
    const context = element.getContext('2d');
    if (!context) return;
    context.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
    context.clearRect(0, 0, size.width, height);
    const sx = (x: number) => scale(x, domains.x, [left, right]);
    const sy = (y: number) => scale(y, domains.y, [bottom, top]);
    if (axes) {
      context.font = '11px sans-serif';
      context.fillStyle = '#64748b';
      context.strokeStyle = '#cbd5e1';
      context.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const fraction = i / 4;
        const x = left + fraction * (right - left);
        const y = bottom - fraction * (bottom - top);
        context.beginPath();
        context.moveTo(left, y);
        context.lineTo(right, y);
        context.stroke();
        context.textAlign = 'right';
        context.fillText(
          formatY(domains.y[0] * (1 - fraction) + domains.y[1] * fraction),
          left - 6,
          y + 4,
        );
        context.textAlign = 'center';
        context.fillText(
          formatX(domains.x[0] * (1 - fraction) + domains.x[1] * fraction),
          x,
          bottom + 20,
        );
      }
    }
    context.save();
    context.beginPath();
    context.rect(left, top, right - left, bottom - top);
    context.clip();
    visible.forEach((line, index) => {
      context.strokeStyle = line.color ?? colors[index % colors.length];
      context.fillStyle = context.strokeStyle;
      context.lineWidth = 2;
      context.beginPath();
      let connected = false;
      for (const point of line.data) {
        const x = sx(point.x);
        const y = sy(point.y);
        if (!isFinitePoint(point) || !Number.isFinite(x) || !Number.isFinite(y)) {
          connected = false;
          continue;
        }
        if (connected) context.lineTo(x, y);
        else context.moveTo(x, y);
        connected = true;
      }
      context.stroke();
      // Dots also make a single-point series visible.
      for (const point of line.data) {
        if (!isFinitePoint(point)) continue;
        const x = sx(point.x);
        const y = sy(point.y);
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
        context.beginPath();
        context.arc(x, y, 2, 0, Math.PI * 2);
        context.fill();
      }
    });
    context.restore();
  }, [visible, domains, size, height, axes, left, right, bottom, formatX, formatY]);

  const fraction = hover ? Math.max(0, Math.min(1, (hover.x - left) / (right - left))) : 0;
  const hoverX = domains.x[0] * (1 - fraction) + domains.x[1] * fraction;
  const entries =
    hover && tooltip
      ? visible.flatMap((line) => {
          const point = nearestPoint(line.data, hoverX);
          return point ? [{ series: line, point }] : [];
        })
      : [];

  return (
    <div
      ref={host}
      className={`lp-stream-chart ${className}`}
      style={{ position: 'relative', ...style }}
    >
      <canvas
        ref={canvas}
        role="img"
        aria-label={label}
        style={{ display: 'block', width: '100%', height }}
        onPointerMove={(event) => {
          if (!tooltip) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          setHover({ x: event.clientX - bounds.left, y: event.clientY - bounds.top });
        }}
        onPointerLeave={() => setHover(null)}
      >
        {label}
      </canvas>
      {entries.length > 0 && hover && (
        <div
          className="lp-stream-chart__tooltip"
          role="status"
          style={{
            position: 'absolute',
            pointerEvents: 'none',
            left: Math.max(0, Math.min(hover.x, size.width - 160)),
            top: Math.max(0, hover.y - 36),
          }}
        >
          {renderTooltip
            ? renderTooltip(entries)
            : entries.map(({ series: line, point }) => (
                <div key={line.id}>
                  {line.label ?? line.id}: {formatX(point.x)}, {formatY(point.y)}
                </div>
              ))}
        </div>
      )}
    </div>
  );
}
