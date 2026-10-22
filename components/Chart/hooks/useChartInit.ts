import { useEffect, useRef } from 'react';
import { createChart, CandlestickSeries, type IChartApi, type ISeriesApi } from 'lightweight-charts';
import { IndicatorManager } from '@/services/indicators/IndicatorManager';

/**
 * 图表初始化 Hook
 * 职责：创建 chart、series 和 IndicatorManager
 */
export function useChartInit() {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const managerRef = useRef<IndicatorManager | null>(null);

  useEffect(() => {
    if (!containerRef.current) {return;}

    try {
      // 创建图表
      const chart = createChart(containerRef.current, {
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
        layout: {
          background: { color: '#111827' },
          textColor: '#d1d5db',
        },
        grid: {
          vertLines: { color: '#1f2937' },
          horzLines: { color: '#1f2937' },
        },
        timeScale: {
          borderColor: '#1f2937',
          timeVisible: true,
          secondsVisible: false,
        },
      });

      chartRef.current = chart;

      // 添加 K 线系列
      const candlestickSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#10b981',
        downColor: '#ef4444',
        wickUpColor: '#10b981',
        wickDownColor: '#ef4444',
      }, 0);

      seriesRef.current = candlestickSeries;

      // 初始化指标管理器
      managerRef.current = new IndicatorManager(chart);

      console.info('[useChartInitialization] Chart initialized');

      // 响应式处理
      const handleResize = () => {
        if (containerRef.current && chartRef.current) {
          chartRef.current.applyOptions({
            width: containerRef.current.clientWidth,
            height: containerRef.current.clientHeight,
          });
        }
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        if (managerRef.current) {
          managerRef.current.clear();
          managerRef.current = null;
        }
        chart.remove();
      };
    } catch (error) {
      console.error('[useChartInitialization] Error:', error);
    }
  }, []);

  return {
    containerRef,
    chartRef,
    seriesRef,
    managerRef,
  };
}
