import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { KlineState, KlineCacheItem } from '@/types/store';
import { KlineBar, KlineInterval } from '@/types/market';
import { klineMockService } from '@/services/mock';

/**
 * K线 Store
 * 职责：管理 K线数据、缓存、订阅
 */
export const useKlineStore = create<KlineState>()(
  persist(
    (set, get) => ({
      bars: [],
      interval: '1h',
      cache: {},
      isLoading: false,

      /**
       * 拉取历史 K线数据
       */
      fetchHistory: async (symbol, interval, limit, before?) => {
        set({ isLoading: true });

        try {
          // 开发阶段：使用 Mock 数据
          const bars = klineMockService.generateHistory(symbol, interval, limit, before);

          // 保存到缓存
          get().saveToCache(symbol, interval, bars);

          set({ bars, interval, isLoading: false });
          return bars;
        } catch (error) {
          console.error('Fetch K-line history error:', error);
          set({ isLoading: false });
          return [];
        }
      },

      /**
       * 订阅实时 K线更新
       */
      subscribeBars: (symbol, interval, callback) => {
        // 开发阶段：使用 Mock 数据模拟实时更新
        const mockInterval = setInterval(() => {
          const bar = klineMockService.generateRealtimeBar(interval);
          callback(bar);

          // 更新 Store 中的最新 bar
          get().updateBar(symbol, bar);
        }, 5000); // 每 5 秒更新一次

        // 返回取消订阅函数
        return () => {
          clearInterval(mockInterval);
        };
      },

      /**
       * 取消订阅
       */
      unsubscribeBars: (symbol, interval) => {
        // WebSocket 取消订阅逻辑
        // wsCenter.unsubscribeSymbol(symbol, ['bar_update']);
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
            bars[bars.length - 1] = bar;
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
        return isExpired ? null : cached.bars;
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
