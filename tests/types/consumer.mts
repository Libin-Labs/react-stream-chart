import { createElement } from 'react';
import { StreamChart, appendPoints, type StreamChartProps } from '@lp-labs/react-stream-chart';

const props: StreamChartProps = {
  series: [{ id: 'readings', data: appendPoints([], [{ x: 1, y: 2 }]) }],
  tooltip: true,
};
createElement(StreamChart, props);
