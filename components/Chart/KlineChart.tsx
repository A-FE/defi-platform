'use client';

import { memo } from 'react';
import { useKlineChart } from './hooks/useKlineChart';
import { useKlineStore } from '@/stores';
import ChartControls from './ChartControls';
import { IndicatorLegend } from './IndicatorLegend';
import { KlineInterval } from '@/types/market';
import EmptyState from '@/components/EmptyState/EmptyState';

interface KlineChartProps {
  symbol: string;
  defaultInterval?: KlineInterval;
}

/**
 * K线图主组件 - 统一架构 V2
 * 职责：提供图表容器和控制栏
 * 架构：单 chart 动态多 pane
 *  - Pane 0: K线 + 主图指标 (MA/EMA/BOLL) - 固定
 *  - Pane 1-4: 副图指标 (RSI/MACD/KDJ/VOL) - 动态创建/移除
 * 所有 pane 共享同一时间轴，天然对齐
 *
 * V2 改进（统一 Hook）：
 *  - 使用单一的 useKlineChart hook 管理所有逻辑
 *  - 图表初始化 + K 线数据 + 指标渲染 统一在一个 hook 内
 *  - 简化组件代码，提高可维护性
 *
 * ✅ 性能优化：使用 React.memo 避免不必要的重渲染
 */
const KlineChartComponent = ({ symbol, defaultInterval = '1d' }: KlineChartProps) => {
  // ✅ 统一的图表 hook（合并了原来的 3 个 hooks）
  const {
    containerRef,
    chartRef,
    isLoading,
    isLoadingMore,
    interval,
    setInterval,
    legends,
  } = useKlineChart({ symbol, initialInterval: defaultInterval });

  // 检查是否有数据
  const bars = useKlineStore((state) => state.bars);
  const hasData = bars.length > 0;
  const showEmptyState = !isLoading && !hasData;

  return (
    <div className="w-full h-full flex flex-col bg-gray-900 rounded-lg border border-gray-800 p-4">
      {/* 控制栏 */}
      <ChartControls interval={interval} onIntervalChange={setInterval} />

      {/* 图表容器：单个 chart，包含主副 pane */}
      <div className="flex-1 relative">
        {/* ✅ 始终渲染图表容器，确保 useChartInit 能正常工作 */}
        <div ref={containerRef} className="absolute inset-0" />

        {/* 指标图例 */}
        <IndicatorLegend legends={legends} chartRef={chartRef} />

        {/* 初始加载状态（优先级最高，z-index: 20） */}
        {isLoading && (
          <div className="absolute inset-0 bg-gray-900 flex items-center justify-center z-20">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-gray-400">加载中...</span>
            </div>
          </div>
        )}

        {/* 空状态提示（覆盖在图表上方，z-index: 10） */}
        {showEmptyState && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
            <EmptyState
              title="暂无数据"
              message="当前交易对没有可用的K线数据，请检查 Bitquery API 配置或选择其他交易对"
            />
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
};

// ✅ 性能优化：使用 memo 避免父组件重渲染时的不必要更新
export const KlineChart = memo(KlineChartComponent);

export default KlineChart;
