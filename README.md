# @lp-labs/react-stream-chart

Package version: `1.0.0`.

```sh
npm install @lp-labs/react-stream-chart react
```

A controlled canvas line chart. React `^18.2.0 || ^19.0.0` is the only runtime
peer; no plotting framework or shared package is required. ESM, CommonJS and
TypeScript declarations are included.

```tsx
import { useState } from "react";
import { StreamChart, appendPoints, type Point } from "@lp-labs/react-stream-chart";
import "@lp-labs/react-stream-chart/style.css";

export function Readings() {
  const [points, setPoints] = useState<Point[]>([]);
  return <>
    <button onClick={() => setPoints(old => appendPoints(old, [
      { x: Date.now(), y: Math.random() * 100 }
    ], 500))}>Add reading</button>
    <StreamChart
      series={[{ id: "load", label: "Load", color: "#2563eb", data: points }]}
      yDomain={[0, 100]}
      tooltip
      label="Load readings, from zero to one hundred"
    />
  </>;
}
```

## Component API

`StreamChartProps`:

| Prop | Type | Default / behavior |
| --- | --- | --- |
| `series` | `readonly Series[]` | Required; replace arrays for live updates |
| `height` | `number` | `260` CSS pixels; finite and positive |
| `xDomain`, `yDomain` | `readonly [number, number]` | Finite data extent; empty extent `[0,1]` |
| `maxPoints` | `number` | Unbounded rendering; positive integer takes the last N entries per series |
| `axes` | `boolean` | `true`; five labeled ticks and horizontal grid lines |
| `tooltip` | `boolean` | `false`; nearest X value per series on pointer move |
| `label` | `string` | `"Line chart"`; canvas accessible name and fallback text |
| `formatX`, `formatY` | `(value: number) => string` | Four significant digits |
| `renderTooltip` | `(entries: readonly TooltipEntry[]) => ReactNode` | Series name and formatted X/Y |
| `className`, `style` | `string`, `CSSProperties` | Wrapper customization |

`Point = { x: number; y: number }`.
`Series = { id: string; label?: string; color?: string; data: readonly Point[] }`.
Use unique series IDs and valid CSS colors. `TooltipEntry` contains `series`
and `point`. Domain bounds must be ascending; equal bounds are expanded.
Invalid height, capacity or domain inputs throw `RangeError`. Non-finite
points are skipped and break the line rather than connecting across gaps.
Points are drawn in input order; sort by X yourself when necessary.

## Pure helpers

- `appendPoints(current, incoming, capacity = 1000): Point[]` filters invalid
  points and keeps the last `capacity` samples, without mutating input.
- `getDomains(series, overrides = {}): ChartDomains` computes X/Y domains.
- `normalizeDomain(domain): Domain` validates and expands constant domains.
- `scale(value, domain, range): number` linearly maps a value; pass a
  normalized, non-degenerate domain and finite values.
- `nearestPoint(points, x): Point | undefined` performs an unsorted linear scan.
- `isFinitePoint(point): boolean` checks both coordinates.
- `Domain` is a readonly numeric pair; `ChartDomains` is `{ x: Domain; y: Domain }`.

All exports are named. `Point`, `Series`, `Domain`, `ChartDomains`,
`TooltipEntry`, and `StreamChartProps` are type-only; the seven runtime exports
are `StreamChart` and the six helpers above. Array helper arguments are readonly;
`getDomains` overrides have type `Partial<ChartDomains>`.
`nearestPoint` skips non-finite points, returns undefined if none remain, and
keeps the first point on a distance tie. `scale` does not clamp its result.

```ts
import { appendPoints, getDomains, nearestPoint, scale } from "@lp-labs/react-stream-chart";

const points = appendPoints([], [{ x: 0, y: 10 }, { x: 1, y: 20 }], 100);
const domains = getDomains([{ id: "readings", data: points }]);
console.log(nearestPoint(points, 0.8)); // { x: 1, y: 20 }
console.log(scale(0.5, domains.x, [0, 100])); // 50
```

Without a series color, the chart cycles `#2563eb`, `#dc2626`, `#059669`,
`#9333ea`, `#d97706` in array order. Formatting and tooltip-renderer errors
propagate; they are application code, not validated data.

## Layout, accessibility and limits

Give the parent a nonzero width. ResizeObserver measures width; window resize
also refreshes device pixel ratio. Canvas uses backing-store DPR sizing and
repaints on immutable prop updates. Observers/listeners disconnect on unmount.
Without ResizeObserver, window resizing still works. No animation loop, timers
or retained streaming history are created. `maxPoints` only limits rendering;
use `appendPoints` to bound application memory.

CSS is optional; it styles the tooltip, not the data geometry. Override
`.lp-stream-chart__tooltip` and provide per-series colors for customization.
The canvas has an image role, not an interactive keyboard data explorer.
Provide an adjacent table/text summary when individual values must be
accessible; pointer tooltips are supplementary. Missing canvas support leaves
the accessible name/fallback; server rendering does not draw until mounting.

Each repaint scans and draws the visible samples. Large data sets or frequent
updates cost CPU and canvas memory; batch incoming updates and choose sensible
capacities. There is no decimation, time-axis calendar formatting, zoom, pan,
logarithmic scale or throughput/FPS guarantee.

Import does not measure a container, access browser globals, or create workers.
Mounted canvas work requires a DOM/2D canvas; TypeScript consumers need DOM and
React declarations, not Node ambient types. The component does not subscribe
to a stream and has no cancellation API; clean up your transport/timers in the
parent. Helpers are synchronous.

## License

[MIT](./LICENSE).

## Support

If this library is useful to you, consider supporting its maintenance with a [donation via PayPal](https://www.paypal.me/LibinPrasanth).

## Author

Created by [Libin Prasanth](https://www.linkedin.com/in/libinprasanth/). Connect on LinkedIn for updates and discussion.
