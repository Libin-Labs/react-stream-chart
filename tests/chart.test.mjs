import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { appendPoints, getDomains, nearestPoint, scale } from '../dist/index.js';

test('bounded immutable buffers, domains, invalid points and extreme scales', () => {
  const original = [{ x: 1, y: 2 }];
  assert.deepEqual(
    appendPoints(
      original,
      [
        { x: NaN, y: 4 },
        { x: 2, y: 5 },
        { x: 3, y: 6 },
      ],
      2,
    ),
    [
      { x: 2, y: 5 },
      { x: 3, y: 6 },
    ],
  );
  assert.equal(original.length, 1);
  assert.throws(() => appendPoints([], [], 0), RangeError);
  assert.deepEqual(getDomains([]), { x: [0, 1], y: [0, 1] });
  assert.deepEqual(getDomains([{ id: 'a', data: original }]), { x: [0, 2], y: [1, 3] });
  assert.throws(() => getDomains([], { x: [2, 1] }), RangeError);
  assert.equal(scale(0, [-1e308, 1e308], [0, 100]), 50);
  assert.equal(scale(Number.MIN_VALUE, [0, Number.MIN_VALUE], [0, 100]), 100);
  assert.equal(nearestPoint([{ x: NaN, y: 0 }, ...original], 5), original[0]);
  assert.equal(
    nearestPoint(
      [
        { x: -1e308, y: 1 },
        { x: 0, y: 2 },
      ],
      Number.MAX_VALUE,
    ).y,
    2,
  );
  assert.equal(
    nearestPoint(
      [
        { x: Number.MIN_VALUE, y: 1 },
        { x: 0, y: 2 },
      ],
      0,
    ).y,
    2,
  );
  assert.equal(
    createRequire(import.meta.url)('../dist/cjs/index.js').appendPoints([], [], 2).length,
    0,
  );
});

test('canvas updates, DPR sizing, pointer tooltip and observer cleanup', async () => {
  const { JSDOM } = await import('jsdom');
  const dom = new JSDOM("<div id='root'></div>", { pretendToBeVisual: true });
  for (const name of ['window', 'document', 'HTMLElement', 'HTMLCanvasElement', 'MouseEvent']) {
    globalThis[name] = dom.window[name];
  }
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let disconnected = false;
  let resize;
  globalThis.ResizeObserver = class {
    constructor(callback) {
      resize = callback;
    }
    observe() {}
    disconnect() {
      disconnected = true;
    }
  };
  Object.defineProperty(dom.window, 'devicePixelRatio', { value: 2 });
  let width = 400;
  dom.window.HTMLElement.prototype.getBoundingClientRect = () => ({
    width,
    height: 260,
    left: 0,
    top: 0,
  });
  let clears = 0;
  let arcs = 0;
  dom.window.HTMLCanvasElement.prototype.getContext = () =>
    new Proxy(
      {},
      {
        get: (_, key) =>
          key === 'clearRect' ? () => clears++ : key === 'arc' ? () => arcs++ : () => {},
        set: () => true,
      },
    );
  const { createElement, act } = await import('react');
  const { createRoot } = await import('react-dom/client');
  const { StreamChart } = await import('../dist/index.js');
  const root = createRoot(document.getElementById('root'));
  const render = (data) =>
    createElement(StreamChart, { series: [{ id: 'cpu', data }], tooltip: true, maxPoints: 2 });
  await act(() => root.render(render([{ x: 0, y: 1 }])));
  const canvas = document.querySelector('canvas');
  assert.equal(canvas.width, 800);
  assert.equal(arcs, 1);
  assert.equal(canvas.getAttribute('aria-label'), 'Line chart');
  await act(() =>
    canvas.dispatchEvent(
      new MouseEvent('pointermove', { bubbles: true, clientX: 80, clientY: 40 }),
    ),
  );
  assert.match(document.querySelector('[role=status]').textContent, /cpu/);
  const before = clears;
  const beforeArcs = arcs;
  await act(() =>
    root.render(
      render([
        { x: 1, y: 3 },
        { x: 2, y: 4 },
      ]),
    ),
  );
  assert.ok(clears > before);
  assert.equal(arcs - beforeArcs, 2);
  await act(() => canvas.dispatchEvent(new MouseEvent('pointerout', { bubbles: true })));
  assert.equal(document.querySelector('[role=status]'), null);
  const beforeResize = clears;
  await act(() => window.dispatchEvent(new dom.window.Event('resize')));
  assert.ok(clears > beforeResize);
  width = 600;
  await act(() => resize());
  assert.equal(canvas.width, 1200);
  await act(() => root.render(render([])));
  assert.equal(document.querySelector('[role=status]'), null);
  await act(() => root.unmount());
  assert.equal(disconnected, true);
  const afterUnmount = clears;
  window.dispatchEvent(new dom.window.Event('resize'));
  assert.equal(clears, afterUnmount);
  dom.window.close();
});
