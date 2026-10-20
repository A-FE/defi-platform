import { useRef, useEffect } from 'react';
import { createChart } from 'lightweight-charts';
import type { IChartApi } from 'lightweight-charts';

/**
 * 副图初始化 Hook
 * 职责：创建和管理副图 chart 实例
 * 时间轴同步：与主图共享时间范围和缩放状态
 */
export function useSubChart(mainChartRef?: React.RefObject<IChartApi | null>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    try {
      // 创建副图
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
          visible: true,
          timeVisible: true,
          secondsVisible: false,
          borderColor: '#1f2937',
        },
        rightPriceScale: {
          borderColor: '#1f2937',
          scaleMargins: {
            top: 0.1,
            bottom: 0.1,
          },
        },
      });

      chartRef.current = chart;

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

      // 时间轴同步逻辑
      const mainChart = mainChartRef?.current;

      if (mainChart) {
        // 主图时间范围变化 → 同步副图
        const syncFromMain = () => {
          const mainTimeScale = mainChart.timeScale();
          const subTimeScale = chart.timeScale();
          const mainRange = mainTimeScale.getVisibleLogicalRange();

          if (mainRange) {
            subTimeScale.setVisibleLogicalRange(mainRange);
          }
        };

        mainChart.timeScale().subscribeVisibleLogicalRangeChange(syncFromMain);

        // 副图时间范围变化 → 同步主图
        const syncFromSub = () => {
          const subTimeScale = chart.timeScale();
          const mainTimeScale = mainChart.timeScale();
          const subRange = subTimeScale.getVisibleLogicalRange();

          if (subRange) {
            mainTimeScale.setVisibleLogicalRange(subRange);
          }
        };

        chart.timeScale().subscribeVisibleLogicalRangeChange(syncFromSub);

        // 初始同步
        syncFromMain();

        // 清理
        return () => {
          window.removeEventListener('resize', handleResize);
          mainChart.timeScale().unsubscribeVisibleLogicalRangeChange(syncFromMain);
          chart.timeScale().unsubscribeVisibleLogicalRangeChange(syncFromSub);
          chart.remove();
        };
      }

      // 无主图时的清理
      return () => {
        window.removeEventListener('resize', handleResize);
        chart.remove();
      };
    } catch (error) {
      console.error('Sub chart initialization error:', error);
    }
  }, [mainChartRef]);

  return { containerRef, chartRef };
}
