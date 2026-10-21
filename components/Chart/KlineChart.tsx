'use client';

import { useKlineChart } from './hooks/useKlineChart';
import ChartControls from './ChartControls';
import { KlineInterval } from '@/types/market';

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
 */
export function KlineChart({ symbol, defaultInterval = '1h' }: KlineChartProps) {
  // ✅ 统一的图表 hook（合并了原来的 3 个 hooks）
  const {
    containerRef,
    isLoading,
    isLoadingMore,
    interval,
    setInterval,
  } = useKlineChart(symbol, defaultInterval);

  return (
    <div className="w-full h-full flex flex-col bg-gray-900 rounded-lg border border-gray-800 p-4">
      {/* 控制栏 */}
      <ChartControls interval={interval} onIntervalChange={setInterval} />

      {/* 图表容器：单个 chart，包含主副 pane */}
      <div className="flex-1 relative">
        <div ref={containerRef} className="absolute inset-0" />

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
