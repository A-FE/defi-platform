'use client';

import { useChartInit } from './hooks/useChartInit';
import { useKlineData } from './hooks/useKlineData';
import { useIndicators } from './hooks/useIndicators';
import { useSubChart } from './hooks/useSubChart';
import ChartControls from './ChartControls';
import { KlineInterval } from '@/types/market';
import { useKlineStore } from '@/stores';

interface KlineChartProps {
  symbol: string;
  defaultInterval?: KlineInterval;
}

/**
 * K线图主组件
 * 职责：组合各个子组件，协调数据流
 * 布局：主图（K线+主图指标） + 副图（RSI/MACD/KDJ/VOL）
 */
export function KlineChart({ symbol, defaultInterval = '1h' }: KlineChartProps) {
  // 主图初始化
  const { containerRef, chartRef, seriesRef } = useChartInit();

  // 副图初始化（传入主图引用以实现时间轴同步）
  const { containerRef: subContainerRef, chartRef: subChartRef } = useSubChart(chartRef);

  // K线数据
  const bars = useKlineStore((state) => state.bars);

  // 指标管理（传入主图和副图实例）
  const { updateRealtimeIndicators } = useIndicators(
    chartRef,
    seriesRef,
    bars,
    subChartRef
  );

  // K线数据管理（传入指标更新函数）
  const { interval, setInterval, isLoading, isLoadingMore } = useKlineData(
    symbol,
    defaultInterval,
    chartRef,
    seriesRef,
    updateRealtimeIndicators
  );

  return (
    <div className="w-full h-full flex flex-col bg-gray-900 rounded-lg border border-gray-800 p-4">
      {/* 控制栏 */}
      <ChartControls interval={interval} onIntervalChange={setInterval} />

      {/* 图表容器：主图 70% + 副图 30% */}
      <div className="flex-1 flex flex-col gap-2 relative">
        {/* 主图：K线 + 主图指标 (MA/EMA/BOLL) */}
        <div className="flex-[7] relative min-h-0">
          <div ref={containerRef} className="absolute inset-0" />
        </div>

        {/* 副图：RSI/MACD/KDJ/VOL */}
        <div className="flex-[3] relative min-h-0 border-t border-gray-800">
          <div ref={subContainerRef} className="absolute inset-0" />
        </div>

        {/* 初始加载状态 */}
        {isLoading && (
          <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-gray-400">加载中...</span>
            </div>
          </div>
        )}

        {/* 左侧加载更多指示器 */}
        {isLoadingMore && (
          <div className="absolute left-4 top-4 bg-gray-800/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-gray-700 flex items-center gap-2 z-10">
            <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-gray-300">加载历史数据...</span>
          </div>
        )}
      </div>

      {/* 底部提示 */}
      <div className="mt-2 text-xs text-gray-500 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span>• 滚轮缩放</span>
          <span>• 拖拽平移</span>
          <span>• 左滑加载历史</span>
        </div>
        <span>TradingView Lightweight Charts</span>
      </div>
    </div>
  );
}

export default KlineChart;
