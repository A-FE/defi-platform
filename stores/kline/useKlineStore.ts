import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { KlineState, KlineCacheItem } from '@/types/store';
import { KlineBar, KlineInterval } from '@/types/market';
import { klineSessionManager, TimeAlignmentUtil } from '@/services/mock/kline';

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
          // 获取或创建该 symbol+interval 的会话
          const session = klineSessionManager.getOrCreateSession(symbol, interval);

          // 生成历史数据
          const bars = session.generateHistory(limit, before);

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
        // 获取该 symbol+interval 的会话
        const session = klineSessionManager.getOrCreateSession(symbol, interval);

        // 根据K线周期动态调整更新频率
        // 1m/5m 周期：每1秒更新（实时感强）
        // 15m/1h 周期：每2秒更新
        // 4h/1d/1w 周期：每5秒更新
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
        const mockInterval = setInterval(() => {
          try {
            // 每次都重新计算当前对齐的时间戳，确保准确性
            const currentBarTime = TimeAlignmentUtil.getCurrentAlignedTime(interval);

            // 生成实时更新
            const bar = session.generateRealtimeUpdate(currentBarTime);

            // 只有时间戳有效时才回调
            if (TimeAlignmentUtil.validateBarTime(bar.time, lastBarTime)) {
              lastBarTime = bar.time;
              callback(bar);

              // 更新 Store 中的最新 bar
              get().updateBar(symbol, bar);
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
