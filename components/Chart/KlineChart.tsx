'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { useChartInit } from './hooks/useChartInit';
import { useKlineData } from './hooks/useKlineData';
import { useIndicators } from './hooks/useIndicators';
import ChartControls from './ChartControls';
import { KlineInterval } from '@/types/market';
import { useIndicatorStore } from '@/stores';
import { convertIndicatorConfigsToParams } from '@/services/api/indicatorApi';

interface KlineChartProps {
  symbol: string;
  defaultInterval?: KlineInterval;
}

/**
 * K线图主组件 V3 - 统一接口架构
 * 职责：组合各个子组件，协调数据流
 * 架构：单 chart 动态多 pane
 *  - Pane 0: K线 + 主图指标 (MA/EMA/BOLL) - 固定
 *  - Pane 1-4: 副图指标 (RSI/MACD/KDJ/VOL) - 动态创建/移除
 * 所有 pane 共享同一时间轴，天然对齐
 *
 * V3 核心改变（统一接口重构）：
 *  - 统一使用 fetchKlines 获取 K 线 + 指标数据
 *  - useKlineData 负责完整数据流（K 线 + 指标）
 *  - useIndicators 只负责渲染（接收数据，不获取数据）
 *  - 架构更清晰，代码更简洁
 */
export function KlineChart({ symbol, defaultInterval = '1h' }: KlineChartProps) {
  // 主图初始化（只包含主 pane）
  const { containerRef, chartRef, seriesRef } = useChartInit();

  // 使用 state 管理 interval
  const [interval, setInterval] = useState<KlineInterval>(defaultInterval);

  // ✅ 获取当前启用的指标配置
  const { getEnabledIndicators } = useIndicatorStore();
  const enabledIndicators = useMemo(() => {
    const configs = getEnabledIndicators();
    return convertIndicatorConfigsToParams(configs.map(c => ({
      type: c.type,
      params: c.params,
    })));
  }, [getEnabledIndicators]);

  // ✅ K 线数据管理（包括指标）
  const {
    interval: _interval,
    setInterval: setKlineInterval,
    isLoading,
    isLoadingMore,
    klineData  // ✅ 获取完整数据（K 线 + 指标）
  } = useKlineData(
    symbol,
    interval,
    chartRef,
    seriesRef,
    enabledIndicators  // ✅ 传入指标配置
  );

  // ✅ 指标渲染（只负责渲染，数据来自 useKlineData）
  useIndicators(chartRef, seriesRef, klineData);

  // 同步周期切换
  const handleIntervalChange = (newInterval: KlineInterval) => {
    setInterval(newInterval);
    setKlineInterval(newInterval);
  };

  return (
    <div className="w-full h-full flex flex-col bg-gray-900 rounded-lg border border-gray-800 p-4">
      {/* 控制栏 */}
      <ChartControls interval={interval} onIntervalChange={handleIntervalChange} />

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
