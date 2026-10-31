export interface Point {
  x: number;
  y: number;
}

export interface Series {
  id: string;
  label?: string;
  color?: string;
  data: readonly Point[];
}

export type Domain = readonly [number, number];

export interface ChartDomains {
  x: Domain;
  y: Domain;
}

export const isFinitePoint = (point: Point): boolean =>
  Number.isFinite(point.x) && Number.isFinite(point.y);

/** Returns a new bounded array; inputs are never mutated. Invalid points are omitted. */
export function appendPoints(
  current: readonly Point[],
  incoming: readonly Point[],
  capacity = 1000,
): Point[] {
  if (!Number.isInteger(capacity) || capacity < 1) {
    throw new RangeError('capacity must be a positive integer');
  }
  return [...current, ...incoming].filter(isFinitePoint).slice(-capacity);
}

export function normalizeDomain(domain: Domain): Domain {
  const [min, max] = domain;
  if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) {
    throw new RangeError('Domains must contain finite, ascending bounds');
  }
  if (min !== max) return [min, max];
  const pad = Math.max(1, Math.abs(min) * 0.01);
  const lower = min - pad;
  const upper = max + pad;
  return [Number.isFinite(lower) ? lower : min, Number.isFinite(upper) ? upper : max];
}

export function getDomains(
  series: readonly Series[],
  overrides: Partial<ChartDomains> = {},
): ChartDomains {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const line of series) {
    for (const point of line.data) {
      if (!isFinitePoint(point)) continue;
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    }
  }
  return {
    x: normalizeDomain(overrides.x ?? (minX === Infinity ? [0, 1] : [minX, maxX])),
    y: normalizeDomain(overrides.y ?? (minY === Infinity ? [0, 1] : [minY, maxY])),
  };
}

export function scale(value: number, domain: Domain, range: Domain): number {
  const span = domain[1] - domain[0];
  const offset = value - domain[0];
  // Only halve when necessary: halving subnormal domains can erase their span.
  const fraction =
    Number.isFinite(span) && Number.isFinite(offset)
      ? offset / span
      : (value / 2 - domain[0] / 2) / (domain[1] / 2 - domain[0] / 2);
  return range[0] + fraction * (range[1] - range[0]);
}

export function nearestPoint(points: readonly Point[], x: number): Point | undefined {
  let nearest: Point | undefined;
  let distance = Infinity;
  let halfDistance = Infinity;
  for (const point of points) {
    if (!isFinitePoint(point)) continue;
    const next = Math.abs(point.x - x);
    const nextHalf = Math.abs(point.x / 2 - x / 2);
    if (
      next < distance ||
      (next === Infinity && distance === Infinity && nextHalf < halfDistance)
    ) {
      nearest = point;
      distance = next;
      halfDistance = nextHalf;
    }
  }
  return nearest;
}
