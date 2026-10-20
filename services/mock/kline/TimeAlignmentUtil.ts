import { KlineInterval } from '@/types/market';

/**
 * 时间对齐工具
 * 职责：统一管理 K线时间戳的计算和验证
 */
export class TimeAlignmentUtil {
  /**
   * 获取周期对应的毫秒数
   */
  static getIntervalMs(interval: KlineInterval): number {
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
  }

  /**
   * 获取周期对应的秒数
   */
  static getIntervalSeconds(interval: KlineInterval): number {
    return this.getIntervalMs(interval) / 1000;
  }

  /**
   * 将时间戳对齐到周期的起点
   * @param timestamp 秒级时间戳
   * @param interval K线周期
   * @returns 对齐后的秒级时间戳
   */
  static alignToInterval(timestamp: number, interval: KlineInterval): number {
    const intervalSeconds = this.getIntervalSeconds(interval);
    return Math.floor(timestamp / intervalSeconds) * intervalSeconds;
  }

  /**
   * 获取当前对齐的时间戳
   * @param interval K线周期
   * @returns 对齐到周期起点的秒级时间戳
   */
  static getCurrentAlignedTime(interval: KlineInterval): number {
    const now = Math.floor(Date.now() / 1000);
    return this.alignToInterval(now, interval);
  }

  /**
   * 验证新的 bar 时间戳是否有效
   * @param newTime 新 bar 的时间戳
   * @param lastTime 上一根 bar 的时间戳
   * @returns true 表示有效（newTime >= lastTime）
   */
  static validateBarTime(newTime: number, lastTime: number): boolean {
    return newTime >= lastTime;
  }

  /**
   * 计算历史数据的结束时间（对齐到周期）
   * @param interval K线周期
   * @param before 可选的截止时间戳
   * @returns 对齐后的结束时间戳
   */
  static getHistoryEndTime(interval: KlineInterval, before?: number): number {
    const timestamp = before || Math.floor(Date.now() / 1000);
    return this.alignToInterval(timestamp, interval);
  }
}
