/* eslint-disable complexity */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable max-lines-per-function */
import { create } from 'zustand';
import { DepthState } from '@/types/store';
import { DepthItem } from '@/types/market';
import { wsCenter } from '@/services/websocket';
import { depthMockService } from '@/services/mock';
import { DEPTH_LEVELS } from '@/constants/api';

/**
 * 订单簿 Store
 * 职责：管理订单簿深度数据
 */
export const useDepthStore = create<DepthState>((set, get) => {
  // ✅ 性能优化：保存定时器 ID，支持清理
  let highlightTimer: NodeJS.Timeout | null = null;
  // ✅ 性能优化：使用版本号追踪变化，避免每次创建新 Map
  let changeVersion = 0;

  return {
    bids: [],
    asks: [],
    sequence: 0,
    changedPrices: new Map(),

    /**
     * 订阅订单簿深度
     */
    subscribe: (symbol: string) => {
      // 1. 首次获取快照
      const snapshot = depthMockService.generateSnapshot(symbol, DEPTH_LEVELS);
      get().handleSnapshot(snapshot);

      // 2. 订阅增量更新
      const unsubscribeSnapshot = wsCenter.subscribe('depth_snapshot', (message) => {
        if (message.symbol === symbol) {
          get().handleSnapshot(message);
        }
      });

      const unsubscribeUpdate = wsCenter.subscribe('depth_update', (message) => {
        if (message.symbol === symbol) {
          get().handleUpdate(message);
        }
      });

      // 开发阶段：使用 Mock 数据模拟实时更新
      // ✅ 性能优化：降低更新频率 100ms → 300ms，减少 CPU 负载
      const mockInterval = setInterval(() => {
        const update = depthMockService.generateUpdate(symbol);
        get().handleUpdate(update);
      }, 300); // 每 300ms 更新一次（从 100ms 优化而来）

      // 清理函数
      return () => {
        unsubscribeSnapshot();
        unsubscribeUpdate();
        clearInterval(mockInterval);
      };
    },

    /**
     * 取消订阅
     */
    unsubscribe: (symbol: string) => {
      wsCenter.unsubscribeSymbol(symbol, ['depth_snapshot', 'depth_update']);
    },

    /**
     * 处理快照
     * ✅ 性能优化：使用 Map 代替 Set
     */
    handleSnapshot: (data: any) => {
      set({
        bids: data.bids || [],
        asks: data.asks || [],
        sequence: data.sequence || 0,
        changedPrices: new Map(),
      });
    },

    /**
     * 处理增量更新
     * ✅ 性能优化 V2：只在数据真正变化时才更新 state，避免不必要的重渲染
     */
    handleUpdate: (data: any) => {
      const { bids: currentBids, asks: currentAsks, sequence: currentSeq } = get();

      // 序列号校验（防乱序）
      if (data.sequence && data.sequence <= currentSeq) {
        console.warn('[Depth] Outdated update, ignoring');
        return;
      }

      // ✅ 关键优化：检查是否有实际更新
      const hasBidsUpdate = data.bids && data.bids.length > 0;
      const hasAsksUpdate = data.asks && data.asks.length > 0;

      // 如果没有任何更新，直接返回
      if (!hasBidsUpdate && !hasAsksUpdate) {
        return;
      }

      // ✅ 性能优化：使用 Map 记录变化的价格及其版本号
      changeVersion++;
      const changedPricesMap = new Map<number, number>();
      let newBids = currentBids;
      let newAsks = currentAsks;
      let bidsChanged = false;
      let asksChanged = false;

      // 更新买盘
      if (hasBidsUpdate) {
        const updated = updateDepthSide(currentBids, data.bids, 'desc', changedPricesMap, changeVersion);
        const trimmed = updated.slice(0, DEPTH_LEVELS);
        // ✅ 只在数据真正变化时才更新引用
        if (!areDepthArraysEqual(currentBids, trimmed)) {
          newBids = trimmed;
          bidsChanged = true;
        }
      }

      // 更新卖盘
      if (hasAsksUpdate) {
        const updated = updateDepthSide(currentAsks, data.asks, 'asc', changedPricesMap, changeVersion);
        const trimmed = updated.slice(0, DEPTH_LEVELS);
        // ✅ 只在数据真正变化时才更新引用
        if (!areDepthArraysEqual(currentAsks, trimmed)) {
          newAsks = trimmed;
          asksChanged = true;
        }
      }

      // ✅ 只在有实际变化或有高亮需求时才更新 state
      const hasChanges = bidsChanged || asksChanged || changedPricesMap.size > 0;

      if (!hasChanges) {
        return;
      }

      set({
        bids: newBids,
        asks: newAsks,
        sequence: data.sequence || currentSeq,
        changedPrices: changedPricesMap,
      });

      // ✅ 性能优化：清理旧定时器，避免多个定时器累积
      if (highlightTimer) {
        clearTimeout(highlightTimer);
      }

      // 1 秒后清除高亮
      highlightTimer = setTimeout(() => {
        set({ changedPrices: new Map() });
        highlightTimer = null;
      }, 1000);
    },
  };
});

/**
 * ✅ 性能优化：比较两个深度数组是否相等（避免不必要的引用更新）
 *
 * 只比较价格和数量，不比较累计量（累计量是计算出来的）
 */
function areDepthArraysEqual(arr1: DepthItem[], arr2: DepthItem[]): boolean {
  if (arr1.length !== arr2.length) { return false; }

  for (let i = 0; i < arr1.length; i++) {
    if (
      arr1[i].price !== arr2[i].price ||
      arr1[i].quantity !== arr2[i].quantity
    ) {
      return false;
    }
  }

  return true;
}

/**
 * ✅ 性能优化：增量更新深度一侧（避免每次全量排序）
 *
 * 优化策略：
 * 1. 只有在价格档位变化时才重新排序
 * 2. 对于已存在价格的更新，直接原地修改
 * 3. 减少不必要的数组操作
 * 4. 使用 Map + 版本号记录变化
 */
function updateDepthSide(
  current: DepthItem[],
  updates: DepthItem[] | [number, number][],
  order: 'asc' | 'desc',
  changedPrices: Map<number, number>,
  version: number,
): DepthItem[] {
  // 快速路径：如果更新为空，直接返回当前数据
  if (updates.length === 0) {
    return current;
  }

  let needsSort = false;
  const result = [...current];

  // 应用增量更新
  updates.forEach((item) => {
    const price = Array.isArray(item) ? item[0] : item.price;
    const quantity = Array.isArray(item) ? item[1] : item.quantity;

    // ✅ 使用版本号记录变化
    changedPrices.set(price, version);

    // 查找该价格在数组中的位置
    const index = result.findIndex((d) => d.price === price);

    if (quantity === 0) {
      // 删除该档位
      if (index >= 0) {
        result.splice(index, 1);
      }
    } else if (index >= 0) {
      // 更新已存在的价格（原地修改）
      result[index] = { ...result[index], quantity };
    } else {
      // 新增价格档位
      result.push({ price, quantity, total: 0 });
      needsSort = true; // 新增需要排序
    }
  });

  // 只在有新增价格时才排序
  if (needsSort) {
    result.sort((a, b) => (order === 'desc' ? b.price - a.price : a.price - b.price));
  }

  // 重新计算累计量
  let cumulativeTotal = 0;
  return result.map((item) => {
    cumulativeTotal += item.quantity;
    return {
      ...item,
      total: cumulativeTotal,
    };
  });
}
