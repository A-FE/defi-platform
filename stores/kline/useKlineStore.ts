import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { KlineState, KlineCacheItem } from '@/types/store';
import { KlineBar, KlineInterval } from '@/types/market';
import { klineMockService } from '@/services/mock';

/**
 * 获取周期对应的毫秒数
 */
const getIntervalMs = (interval: KlineInterval): number => {
  const map: Record<KlineInterval, number> = {
    '1m': 60 * 1000,
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '4h': 4 * 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000,
    '1w': 7 * 24 * 60 * 60 * 1000,
  };
  return map[interval];
};

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

          // 确保 time 字段是 number 类型
          const validBars = bars.map((bar) => ({
            ...bar,
            time: typeof bar.time === 'number' ? bar.time : Number(bar.time),
          }));

          // 保存到缓存
          get().saveToCache(symbol, interval, validBars);

          set({ bars: validBars, interval, isLoading: false });
          return validBars;
        } catch (error) {
          console.error('Fetch K-line history error:', error);
          set({ isLoading: false });
          return [];
        }
      },

      /**
       * 订阅实时 K线更新
       */
      subscribeBars: (symbol, interval, lastBar, callback) => {
        // 从历史数据的最后一根 K 线开始
        let lastBarTime: number = lastBar.time;
        let lastClose: number = lastBar.close;

        // 开发阶段：使用 Mock 数据模拟实时更新
        const mockInterval = setInterval(() => {
          const now = Math.floor(Date.now() / 1000);
          const intervalMs = getIntervalMs(interval);
          const currentBarStartTime = Math.floor(now / (intervalMs / 1000)) * (intervalMs / 1000);

          let bar: KlineBar;

          // 如果当前时间仍在最后一根 K 线的周期内，更新它
          if (currentBarStartTime === lastBarTime) {
            // 更新当前 K 线（使用相同的时间戳）
            bar = klineMockService.generateRealtimeBar(interval, lastClose);
            bar.time = lastBarTime; // 确保时间不变
          } else if (currentBarStartTime > lastBarTime) {
            // 生成新的 K 线（时间必须大于最后一根）
            bar = klineMockService.generateRealtimeBar(interval, lastClose);
            lastBarTime = bar.time;
          } else {
            // 当前时间早于最后一根 K 线，跳过（不应该发生）
            console.warn('[subscribeBars] Current bar time is older than last bar, skipping');
            return;
          }

          lastClose = bar.close; // 保存当前收盘价

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
