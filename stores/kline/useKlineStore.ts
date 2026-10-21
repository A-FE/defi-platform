import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { KlineState, KlineCacheItem } from '@/types/store';
import { KlineInterval } from '@/types/market';
import { klineSessionManager, TimeAlignmentUtil } from '@/services/mock/kline';
import { fetchKlineWithIndicators } from '@/services/api/indicatorApi';
import { IndicatorKlineItem } from '@/types/api';

/**
 * 辅助函数：获取 K 线周期对应的秒数
 */
function getIntervalSeconds(interval: KlineInterval): number {
  const map: Record<KlineInterval, number> = {
    '1m': 60,
    '5m': 300,
    '15m': 900,
    '1h': 3600,
    '4h': 14400,
    '1d': 86400,
    '1w': 604800,
  };
  return map[interval] || 3600;
}

/**
 * K线 Store
 * 职责：管理 K线数据、缓存、订阅
 * 统一使用 IndicatorKlineItem，单一数据接口
 */
export const useKlineStore = create<KlineState>()(
  persist(
    (set, get) => ({
      bars: [],
      interval: '1h',
      cache: {},
      isLoading: false,

      /**
       * 统一的 K 线数据获取方法
       * @param symbol 交易对
       * @param interval K线周期
       * @param from 开始时间（UTC 秒）
       * @param to 结束时间（UTC 秒）
       * @param indicators 指标配置列表（可选，为空则只返回 K 线）
       */
      fetchKlines: async (symbol, interval, from, to, indicators = []) => {
        set({ isLoading: true });

        try {
          // 🔧 开发模式：使用 mock 数据
          const useMock = process.env.NODE_ENV === 'development' ||
                          !process.env.NEXT_PUBLIC_INDICATOR_API_ENABLED;

          if (useMock) {
            console.log('[DEV MODE] fetchKlines:', {
              symbol,
              interval,
              from: new Date(from * 1000).toISOString(),
              to: new Date(to * 1000).toISOString(),
              hasIndicators: indicators.length > 0,
            });

            // 1. 生成基础 K 线数据
            const session = klineSessionManager.getOrCreateSession(symbol, interval);
            const limit = Math.ceil((to - from) / getIntervalSeconds(interval));

            // ✅ 使用 before 参数生成指定时间范围之前的历史数据
            // before 参数表示"获取这个时间之前的数据"
            const rawBars = session.generateHistory(limit, to);

            // 转换为 IndicatorKlineItem 格式
            const bars: IndicatorKlineItem[] = rawBars.map(bar => ({
              time: typeof bar.time === 'number' ? bar.time : Number(bar.time),
              open: bar.open,
              high: bar.high,
              low: bar.low,
              close: bar.close,
              volume: bar.volume,
              indicators: {}  // 初始为空
            }));

            // 2. 如果有指标配置，计算指标
            if (indicators.length > 0) {
              const { mockCalculateIndicators } = await import('@/services/mock/indicatorMock');
              const barsWithIndicators = mockCalculateIndicators(bars, {
                symbol,
                resolution: interval,
                from,
                to,
                indicators,
              });

              get().saveToCache(symbol, interval, barsWithIndicators);
              set({ bars: barsWithIndicators, interval, isLoading: false });
              return barsWithIndicators;
            }

            // 3. 没有指标配置，直接返回（indicators 已经是空对象）
            get().saveToCache(symbol, interval, bars);
            set({ bars, interval, isLoading: false });
            return bars;
          }

          // 🚀 生产模式：调用真实后端接口
          const response = await fetchKlineWithIndicators({
            symbol,
            resolution: interval,
            from,
            to,
            indicators,
          });

          get().saveToCache(symbol, interval, response.bars);
          set({ bars: response.bars, interval, isLoading: false });
          return response.bars;

        } catch (error) {
          console.error('[fetchKlines] 获取数据失败:', error);
          set({ isLoading: false });
          return [];
        }
      },

      /**
       * 订阅实时 K线更新（WebSocket 推送 K 线 + 指标）
       */
      subscribeBars: (symbol, interval, lastBar, callback, indicators = []) => {
        // 获取该 symbol+interval 的会话
        const session = klineSessionManager.getOrCreateSession(symbol, interval);

        // 根据K线周期动态调整更新频率
        const updateIntervalMap: Record<KlineInterval, number> = {
          '1m': 1000,   // 1秒
          '5m': 1000,   // 1秒
          '15m': 2000,  // 2秒
          '1h': 2000,   // 2秒
          '4h': 5000,   // 5秒
          '1d': 5000,   // 5秒
          '1w': 5000,   // 5秒
        };
        const updateInterval = updateIntervalMap[interval] || 2000;

        // 使用统一的时间对齐工具计算当前 bar 的时间
        let lastBarTime = lastBar.time;

        // 开发阶段：使用会话生成实时更新
        const mockInterval = setInterval(async () => {  // ✅ 改为 async
          try {
            // 每次都重新计算当前对齐的时间戳，确保准确性
            const currentBarTime = TimeAlignmentUtil.getCurrentAlignedTime(interval);

            // 生成实时更新
            const bar = session.generateRealtimeUpdate(currentBarTime);

            // 只有时间戳有效时才回调
            if (TimeAlignmentUtil.validateBarTime(bar.time, lastBarTime)) {
              lastBarTime = bar.time;

              // ✅ 转换为 IndicatorKlineItem 格式
              let klineItem: IndicatorKlineItem = {
                time: typeof bar.time === 'number' ? bar.time : Number(bar.time),
                open: bar.open,
                high: bar.high,
                low: bar.low,
                close: bar.close,
                volume: bar.volume,
                indicators: {},  // 初始为空
              };

              // ✅ 实时计算指标（如果有订阅）
              if (indicators.length > 0) {
                try {
                  // 获取历史数据用于指标计算
                  const historicalBars = get().bars;

                  // 将当前 bar 合并到历史数据
                  const allBars = [...historicalBars];
                  const lastIndex = allBars.findIndex(b => b.time === klineItem.time);

                  if (lastIndex >= 0) {
                    // 更新现有 bar（保留已有指标，避免丢失）
                    allBars[lastIndex] = {
                      ...allBars[lastIndex],
                      ...klineItem,
                      indicators: allBars[lastIndex].indicators || {},
                    };
                  } else {
                    // 添加新 bar
                    allBars.push(klineItem);
                  }

                  // 动态导入指标计算模块
                  const { mockCalculateIndicators } = await import('@/services/mock/indicatorMock');

                  // 计算指标
                  const barsWithIndicators = mockCalculateIndicators(allBars, {
                    symbol,
                    resolution: interval,
                    from: allBars[0]?.time || klineItem.time,
                    to: klineItem.time,
                    indicators,
                  });

                  // 获取当前 bar 的指标数据
                  const currentBarWithIndicators = barsWithIndicators.find(
                    b => b.time === klineItem.time
                  );

                  if (currentBarWithIndicators) {
                    klineItem = currentBarWithIndicators;
                  }

                  console.log('[subscribeBars] 实时指标计算完成:', {
                    time: new Date(klineItem.time * 1000).toLocaleString(),
                    indicators: Object.keys(klineItem.indicators),
                  });
                } catch (error) {
                  console.error('[subscribeBars] 指标计算失败:', error);
                  // 计算失败时，仍然推送 K 线数据（不带指标）
                }
              }

              callback(klineItem);

              // 更新 Store 中的最新 bar
              get().updateBar(symbol, klineItem);
            }
          } catch (error) {
            console.error('[subscribeBars] 生成实时更新失败:', error);
          }
        }, updateInterval);

        // 返回取消订阅函数
        return () => {
          clearInterval(mockInterval);
          // 销毁该会话，清理状态
          klineSessionManager.destroySession(symbol, interval);
        };
      },

      /**
       * 取消订阅
       */
      unsubscribeBars: (symbol, interval) => {
        // 销毁对应的会话，清理状态
        klineSessionManager.destroySession(symbol, interval);
      },

      /**
       * 更新最新的 K线
       */
      updateBar: (symbol, bar) => {
        set((state) => {
          const bars = [...state.bars];
          const lastBar = bars[bars.length - 1];

          // 如果是同一根 K线（时间相同），则更新
          if (lastBar && lastBar.time === bar.time) {
            // 更新 K 线数据，但保留已有的指标数据
            bars[bars.length - 1] = {
              ...bar,
              indicators: lastBar.indicators || {}  // 保留原有指标
            };
          } else {
            // 否则添加新 K线
            bars.push(bar);
          }

          return { bars };
        });
      },

      /**
       * 从缓存获取数据
       */
      getFromCache: (symbol, interval) => {
        const cacheKey = `${symbol}_${interval}`;
        const cached = get().cache[cacheKey];

        if (!cached) return null;

        // 缓存有效期：5 分钟
        const isExpired = Date.now() - cached.timestamp > 5 * 60 * 1000;
        if (isExpired) return null;

        // 确保 time 字段是 number 类型（防止序列化问题）
        const bars = cached.bars.map((bar) => ({
          ...bar,
          time: typeof bar.time === 'number' ? bar.time : Number(bar.time),
        }));

        return bars;
      },

      /**
       * 保存到缓存
       */
      saveToCache: (symbol, interval, bars) => {
        const cacheKey = `${symbol}_${interval}`;
        set((state) => ({
          cache: {
            ...state.cache,
            [cacheKey]: {
              bars,
              timestamp: Date.now(),
            },
          },
        }));
      },
    }),
    {
      name: 'kline-cache',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ cache: state.cache }), // 只持久化缓存
    }
  )
);
