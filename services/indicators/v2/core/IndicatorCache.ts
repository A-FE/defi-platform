/**
 * 指标数据缓存（V2）
 * 职责：缓存指标计算结果，减少重复计算
 *
 * 缓存策略：
 * 1. Key: symbol + interval + indicatorType + params
 * 2. 验证: barsHash（K线数据变化时失效）
 * 3. 过期: 60 秒（实时数据场景）
 */

import { IndicatorConfig, IndicatorDataPoint } from '../types';

interface CacheEntry {
  data: IndicatorDataPoint[];
  barsHash: string; // K线数据的哈希值
  timestamp: number; // 缓存时间
}

export class IndicatorCache {
  private cache = new Map<string, CacheEntry>();
  private ttl = 60000; // 缓存有效期：60 秒

  /**
   * 获取缓存 Key
   */
  private getCacheKey(
    symbol: string,
    interval: string,
    type: string,
    params: Record<string, unknown>,
  ): string {
    const sortedParams = Object.keys(params).sort();
    const paramsStr = JSON.stringify(params, sortedParams);
    return `${symbol}_${interval}_${type}_${paramsStr}`;
  }

  /**
   * 获取缓存数据
   * @returns 缓存的指标数据，如果过期或不存在则返回 null
   */
  get(
    symbol: string,
    interval: string,
    config: IndicatorConfig,
    barsHash: string, // K线数据的哈希值，用于检测数据是否变化
  ): IndicatorDataPoint[] | null {
    const key = this.getCacheKey(symbol, interval, config.type, config.params);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // 数据变化，缓存失效
    if (entry.barsHash !== barsHash) {
      this.cache.delete(key);
      return null;
    }

    // 过期检查
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    console.info(`[IndicatorCache] Hit: ${key}`);
    return entry.data;
  }

  /**
   * 设置缓存
   */
  set(
    symbol: string,
    interval: string,
    config: IndicatorConfig,
    barsHash: string,
    data: IndicatorDataPoint[],
  ): void {
    const key = this.getCacheKey(symbol, interval, config.type, config.params);

    this.cache.set(key, {
      data,
      barsHash,
      timestamp: Date.now(),
    });

    console.info(`[IndicatorCache] Set: ${key}, data points: ${data.length}`);
  }

  /**
   * 清空指定 symbol 的缓存
   */
  clear(symbol?: string): void {
    if (!symbol) {
      this.cache.clear();
      console.info('[IndicatorCache] Cleared all');
      return;
    }

    const keysToDelete: string[] = [];
    for (const key of this.cache.keys()) {
      if (key.startsWith(symbol)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.cache.delete(key));
    console.info(`[IndicatorCache] Cleared ${keysToDelete.length} entries for ${symbol}`);
  }

  /**
   * 获取缓存统计
   */
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * 设置缓存过期时间
   */
  setTTL(ttl: number): void {
    this.ttl = ttl;
  }
}

/**
 * 计算 K线数据的哈希值（用于缓存验证）
 */
export function hashBars(bars: Array<Record<string, unknown>>): string {
  if (bars.length === 0) {
    return '0';
  }

  // 使用长度 + 最后一根 K线的关键字段生成哈希
  const lastBar = bars[bars.length - 1];
  return `${bars.length}_${lastBar.time}_${lastBar.close}_${lastBar.volume || 0}`;
}
