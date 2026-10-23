/* eslint-disable max-lines-per-function */
import { useRef, useEffect } from 'react';
import { createChart, type IChartApi } from 'lightweight-charts';

/**
 * 副图初始化 Hook
 * 职责：创建和管理副图 chart 实例
 * 时间轴同步：与主图共享时间范围和缩放状态
 */
export function useSubChart(mainChartRef?: React.RefObject<IChartApi | null>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const isReadyRef = useRef(false); // 使用 ref 替代 state，避免触发重渲染

  // 创建副图
  useEffect(() => {
    if (!containerRef.current) {return;}

    try {
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
          rightOffset: 12, // 与主图保持一致的右侧偏移
          barSpacing: 6,    // 与主图保持一致的柱间距
          fixLeftEdge: false,
          fixRightEdge: false,
          lockVisibleTimeRangeOnResize: true, // 锁定可见范围，防止自动调整
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
      isReadyRef.current = true;

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
        chart.remove();
        chartRef.current = null;
        isReadyRef.current = false;
      };
    } catch (error) {
      console.error('Sub chart initialization error:', error);
    }
  }, []);

  // 时间轴同步：等待主图和副图都准备好
  useEffect(() => {
    if (!isReadyRef.current || !mainChartRef?.current || !chartRef.current) {
      return;
    }

    const mainChart = mainChartRef.current;
    const subChart = chartRef.current;

    // 标志位：防止循环触发
    let isSyncing = false;

    // 主图时间范围变化 → 同步副图
    const syncFromMain = () => {
      if (isSyncing) {return;}

      try {
        isSyncing = true;
        const mainTimeScale = mainChart.timeScale();
        const subTimeScale = subChart.timeScale();
        const mainRange = mainTimeScale.getVisibleLogicalRange();

        if (mainRange) {
          subTimeScale.setVisibleLogicalRange(mainRange);
        }
      } finally {
        setTimeout(() => { isSyncing = false; }, 0);
      }
    };

    // 副图时间范围变化 → 同步主图
    const syncFromSub = () => {
      if (isSyncing) {return;}

      try {
        isSyncing = true;
        const subTimeScale = subChart.timeScale();
        const mainTimeScale = mainChart.timeScale();
        const subRange = subTimeScale.getVisibleLogicalRange();

        if (subRange) {
          mainTimeScale.setVisibleLogicalRange(subRange);
        }
      } finally {
        setTimeout(() => { isSyncing = false; }, 0);
      }
    };

    mainChart.timeScale().subscribeVisibleLogicalRangeChange(syncFromMain);
    subChart.timeScale().subscribeVisibleLogicalRangeChange(syncFromSub);

    // 初始同步 - 多次尝试，确保数据加载后也能同步
    const syncMultipleTimes = () => {
      syncFromMain();
      setTimeout(() => syncFromMain(), 100);
      setTimeout(() => syncFromMain(), 500);
      setTimeout(() => syncFromMain(), 1000);
    };

    syncMultipleTimes();

    return () => {
      mainChart.timeScale().unsubscribeVisibleLogicalRangeChange(syncFromMain);
      subChart.timeScale().unsubscribeVisibleLogicalRangeChange(syncFromSub);
    };
  }, [mainChartRef]);

  return { containerRef, chartRef };
}
