'use client';

import { useChartInit } from './hooks/useChartInit';
import { useKlineData } from './hooks/useKlineData';
import ChartControls from './ChartControls';
import { KlineInterval } from '@/types/market';

interface KlineChartProps {
  symbol: string;
  defaultInterval?: KlineInterval;
}

/**
 * K线图主组件
 * 职责：组合各个子组件，协调数据流
 */
export function KlineChart({ symbol, defaultInterval = '1h' }: KlineChartProps) {
  // 图表初始化
  const { containerRef, chartRef, seriesRef } = useChartInit();

  // K线数据管理
  const { interval, setInterval, isLoading } = useKlineData(
    symbol,
    defaultInterval,
    seriesRef
  );

  return (
    <div className="w-full h-full flex flex-col bg-gray-900 rounded-lg border border-gray-800 p-4">
      {/* 控制栏 */}
      <ChartControls interval={interval} onIntervalChange={setInterval} />

      {/* 图表容器 */}
      <div className="flex-1 relative">
        <div ref={containerRef} className="absolute inset-0" />

        {/* 加载状态 */}
        {isLoading && (
          <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-gray-400">加载中...</span>
            </div>
          </div>
        )}
      </div>

      {/* 底部提示 */}
      <div className="mt-2 text-xs text-gray-500 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span>• 滚轮缩放</span>
          <span>• 拖拽平移</span>
        </div>
        <span>TradingView Lightweight Charts</span>
      </div>
    </div>
  );
}

export default KlineChart;
