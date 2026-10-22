import { useEffect, useRef } from 'react';
import { type IChartApi, type ISeriesApi } from 'lightweight-charts';
import { useChartCrosshairStore } from '@/stores/chart/useChartCrosshairStore';
import type { KlineBar } from '@/types/market';

interface UseCrosshairListenerProps {
  chartRef: React.MutableRefObject<IChartApi | null>;
  seriesRef: React.MutableRefObject<ISeriesApi<'Candlestick'> | null>;
  symbol: string;
  klineData: KlineBar[]; // 完整的 K 线数据，用于查找 volume
}

/**
 * 图表十字光标监听 Hook
 *
 * 职责：
 * - 监听图表的 crosshairMove 事件
 * - 将鼠标 hover 的 K 线数据更新到 store
 * - 供 PriceTicker 组件读取显示
 */
export function useCrosshairListener({
  chartRef,
  seriesRef,
  symbol,
  klineData,
}: UseCrosshairListenerProps) {
  const { updateCrosshair, clearCrosshair } = useChartCrosshairStore();

  // 使用 ref 保存 klineData，避免频繁重新订阅
  const klineDataRef = useRef<KlineBar[]>(klineData);

  useEffect(() => {
    klineDataRef.current = klineData;
  }, [klineData]);

  useEffect(() => {
    const chart = chartRef.current;
    const series = seriesRef.current;

    if (!chart || !series) {
      return;
    }

    // 订阅十字光标移动事件
    const handleCrosshairMove = (param: any) => {
      // 鼠标离开图表区域
      if (!param.time || !param.seriesData || param.seriesData.size === 0) {
        clearCrosshair(symbol);
        return;
      }

      // 获取当前 K 线数据
      const data = param.seriesData.get(series);

      if (!data) {
        clearCrosshair(symbol);
        return;
      }

      // 从完整数据中查找对应的 K 线（包含 volume）
      const fullBar = klineDataRef.current.find((bar) => bar.time === param.time);

      // 转换为 KlineBar 格式
      const bar: KlineBar = {
        time: param.time as number,
        open: data.open,
        high: data.high,
        low: data.low,
        close: data.close,
        volume: fullBar?.volume || 0, // 从原始数据中获取成交量
      };

      // 更新 crosshair 数据
      updateCrosshair(symbol, bar, true);
    };

    // 订阅事件
    chart.subscribeCrosshairMove(handleCrosshairMove);

    // 组件卸载时清理
    return () => {
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
      clearCrosshair(symbol);
    };
  }, [chartRef, seriesRef, symbol, updateCrosshair, clearCrosshair]);
}
