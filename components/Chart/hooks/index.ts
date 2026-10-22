// 主 Hook（编排层）
export { useKlineChart } from './useKlineChart';

// 子 Hooks（可选导出，用于高级定制）
export { useChartInit } from './useChartInit';
export { useKlineDataLoader } from './useKlineDataLoader';
export { useInfiniteLoadHistory } from './useInfiniteLoadHistory';
export { useIndicatorRenderer } from './useIndicatorRenderer';
export { useTimeFormatUpdate } from './useTimeFormatUpdate';

// 工具函数
export { getIntervalSeconds, getTimeFormatOptions } from './utils/chartTimeFormat';
