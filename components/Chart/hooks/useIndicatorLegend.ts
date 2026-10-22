/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable max-lines-per-function */
import { useState, useEffect } from 'react';
import type { IChartApi } from 'lightweight-charts';
import type { IndicatorConfig, IndicatorType } from '@/types/indicator';
import type { IndicatorManager } from '@/services/indicators/IndicatorManager';

/**
 * 图例数据项
 */
export interface LegendItem {
  indicator: IndicatorType;
  title: string;
  value: string;
  color: string;
  paneIndex: number;
}

interface UseIndicatorLegendProps {
  chartRef: React.RefObject<IChartApi | null>;
  managerRef: React.RefObject<IndicatorManager | null>;
  enabledIndicators: IndicatorConfig[];
}

/**
 * 指标图例 Hook
 *
 * 职责：
 * - 监听 crosshairMove 事件
 * - 提取当前时间点的指标值（hover 时）或最后一个值（非 hover 时）
 * - 返回格式化的图例数据
 *
 * 改进：
 * - 常驻显示图例
 * - hover 时显示 hover 点的值
 * - 非 hover 时显示最后一个 K 线的值
 * - 监听数据变化，避免 hack 延迟
 */
export function useIndicatorLegend({
  chartRef,
  managerRef,
  enabledIndicators,
}: UseIndicatorLegendProps) {
  const [legends, setLegends] = useState<LegendItem[]>([]);
  const [dataCacheSize, setDataCacheSize] = useState(0);

  useEffect(() => {
    const chart = chartRef.current;
    const manager = managerRef.current;

    if (!chart || !manager) {
      return;
    }

    // 生成图例数据的通用函数
     
    const generateLegends = (time: number | null): LegendItem[] => {
      let indicatorData: any;

      if (time === null) {
        // 非 hover 状态：获取最后一个数据点
        const allData = Array.from((manager as any).dataCache.values());
        if (allData.length === 0) {
          return [];
        }
        indicatorData = allData[allData.length - 1];
      } else {
        // hover 状态：获取指定时间点的数据
        indicatorData = manager.getIndicatorData(time);
        if (!indicatorData) {
          return [];
        }
      }

      const newLegends: LegendItem[] = [];

      // 遍历启用的指标
      enabledIndicators.forEach(config => {
        const paneIndex = manager.getPaneIndex(config.type);

        switch (config.type) {
          case 'RSI': {
            // 多周期 RSI
            if (indicatorData.indicators.rsi) {
              Object.keys(config.params).forEach((periodKey, index) => {
                const period = config.params[periodKey];
                const rsiKey = `rsi${period}`;
                const value = indicatorData.indicators.rsi?.[rsiKey];

                if (value !== undefined) {
                  newLegends.push({
                    indicator: 'RSI',
                    title: `RSI ${period}`,
                    value: value.toFixed(2),
                    color: config.colors[index] || '#2962FF',
                    paneIndex,
                  });
                }
              });
            }
            break;
          }

          case 'MACD': {
            // MACD: DIF, DEA, MACD
            if (indicatorData.indicators.macd) {
              const { dif, dea, macd } = indicatorData.indicators.macd;

              newLegends.push(
                {
                  indicator: 'MACD',
                  title: 'DIF',
                  value: dif.toFixed(4),
                  color: config.colors[0] || '#2962FF',
                  paneIndex,
                },
                {
                  indicator: 'MACD',
                  title: 'DEA',
                  value: dea.toFixed(4),
                  color: config.colors[1] || '#FF6D00',
                  paneIndex,
                },
                {
                  indicator: 'MACD',
                  title: 'MACD',
                  value: macd.toFixed(4),
                  color: macd >= 0 ? '#26a69a' : '#ef5350',
                  paneIndex,
                },
              );
            }
            break;
          }

          case 'KDJ': {
            // KDJ: K, D, J
            if (indicatorData.indicators.kdj) {
              const { k, d, j } = indicatorData.indicators.kdj;

              newLegends.push(
                {
                  indicator: 'KDJ',
                  title: 'K',
                  value: k.toFixed(2),
                  color: config.colors[0] || '#2962FF',
                  paneIndex,
                },
                {
                  indicator: 'KDJ',
                  title: 'D',
                  value: d.toFixed(2),
                  color: config.colors[1] || '#FF6D00',
                  paneIndex,
                },
                {
                  indicator: 'KDJ',
                  title: 'J',
                  value: j.toFixed(2),
                  color: config.colors[2] || '#9C27B0',
                  paneIndex,
                },
              );
            }
            break;
          }

          case 'VOL': {
            // 成交量
            if (indicatorData.volume !== undefined) {
              newLegends.push({
                indicator: 'VOL',
                title: '成交量',
                value: indicatorData.volume.toFixed(0),
                color: indicatorData.close >= indicatorData.open ? '#10b981' : '#ef4444',
                paneIndex,
              });
            }
            break;
          }

          case 'MA': {
            // 多周期 MA（主图）
            if (indicatorData.indicators.ma) {
              Object.keys(config.params).forEach((periodKey, index) => {
                const period = config.params[periodKey];
                const maKey = `ma${period}`;
                const value = indicatorData.indicators.ma?.[maKey];

                if (value !== undefined) {
                  newLegends.push({
                    indicator: 'MA',
                    title: `MA${period}`,
                    value: value.toFixed(2),
                    color: config.colors[index] || '#00bcd4',
                    paneIndex,
                  });
                }
              });
            }
            break;
          }

          case 'EMA': {
            // 多周期 EMA（主图）
            if (indicatorData.indicators.ema) {
              Object.keys(config.params).forEach((periodKey, index) => {
                const period = config.params[periodKey];
                const emaKey = `ema${period}`;
                const value = indicatorData.indicators.ema?.[emaKey];

                if (value !== undefined) {
                  newLegends.push({
                    indicator: 'EMA',
                    title: `EMA${period}`,
                    value: value.toFixed(2),
                    color: config.colors[index] || '#00bcd4',
                    paneIndex,
                  });
                }
              });
            }
            break;
          }

          case 'BOLL': {
            // 布林带（主图）
            if (indicatorData.indicators.boll) {
              const { upper, middle, lower } = indicatorData.indicators.boll;

              newLegends.push(
                {
                  indicator: 'BOLL',
                  title: 'UPPER',
                  value: upper.toFixed(2),
                  color: config.colors[0] || '#FF6D00',
                  paneIndex,
                },
                {
                  indicator: 'BOLL',
                  title: 'MID',
                  value: middle.toFixed(2),
                  color: config.colors[1] || '#2962FF',
                  paneIndex,
                },
                {
                  indicator: 'BOLL',
                  title: 'LOWER',
                  value: lower.toFixed(2),
                  color: config.colors[2] || '#4CAF50',
                  paneIndex,
                },
              );
            }
            break;
          }
        }
      });

      return newLegends;
    };

    // 订阅十字线移动事件
    const handleCrosshairMove = (param: any) => {
      if (param.time) {
        // hover 状态：显示 hover 点的值
        const newLegends = generateLegends(param.time as number);
        setLegends(newLegends);
      } else {
        // 非 hover 状态：显示最后一个值
        const newLegends = generateLegends(null);
        setLegends(newLegends);
      }
    };

    // 监听 dataCache 变化
    const checkDataCache = () => {
      const allData = Array.from((manager as any).dataCache.values());
      const currentSize = allData.length;

      // 当 dataCache 从空变为有数据，或数据量发生变化时，更新图例
      if (currentSize !== dataCacheSize) {
        console.log('[useIndicatorLegend] DataCache size changed:', {
          from: dataCacheSize,
          to: currentSize,
        });
        setDataCacheSize(currentSize);

        if (currentSize > 0) {
          const newLegends = generateLegends(null);
          console.log('[useIndicatorLegend] Legends updated:', newLegends.length);
          setLegends(newLegends);
        }
      }
    };

    // 初始化：生成初始图例
    checkDataCache();

    // 当 enabledIndicators 变化时，强制重新生成图例
    const allData = Array.from((manager as any).dataCache.values());
    if (allData.length > 0) {
      const newLegends = generateLegends(null);
      console.log('[useIndicatorLegend] Indicators changed, regenerating legends:', newLegends.length);
      setLegends(newLegends);
    }

    // 使用 timeScale 的 visibleLogicalRangeChange 事件监听数据变化
    const handleRangeChange = () => {
      checkDataCache();
    };

    chart.subscribeCrosshairMove(handleCrosshairMove);
    chart.timeScale().subscribeVisibleLogicalRangeChange(handleRangeChange);

    return () => {
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(handleRangeChange);
    };
  }, [chartRef, managerRef, enabledIndicators, dataCacheSize]);

  return { legends };
}
