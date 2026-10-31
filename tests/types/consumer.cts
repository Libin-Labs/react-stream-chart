import { createElement } from 'react';
import chart = require('@lp-labs/react-stream-chart');

const props: chart.StreamChartProps = { series: [{ id: 'a', data: [] }] };
createElement(chart.StreamChart, props);
const domain: chart.Domain = chart.normalizeDomain([1, 1]);
chart.scale(1, domain, [0, 100]);
