/**
 * K线图表配置 (lightweight-charts 5.x)
 */
export const CHART_OPTIONS = {
  layout: {
    background: { color: '#111827' },
    textColor: '#d1d5db',
  },
  grid: {
    vertLines: { color: '#1f2937' },
    horzLines: { color: '#1f2937' },
  },
  crosshair: {
    mode: 1,
  },
  timeScale: {
    timeVisible: true,
    secondsVisible: false,
    borderColor: '#1f2937',
  },
  rightPriceScale: {
    borderColor: '#1f2937',
  },
};

/**
 * K线系列配置 (lightweight-charts 5.x)
 */
export const CANDLESTICK_OPTIONS = {
  upColor: '#10b981',
  downColor: '#ef4444',
  borderVisible: false,
  wickUpColor: '#10b981',
  wickDownColor: '#ef4444',
};
