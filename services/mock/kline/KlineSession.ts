import { KlineBar, KlineInterval } from '@/types/market';
import { TimeAlignmentUtil } from './TimeAlignmentUtil';
import { PriceGenerator } from './PriceGenerator';
import { getPriceConfig } from '../priceConfig';

/**
 * K线会话
 * 职责：为特定的 symbol + interval 维护独立的状态和数据生成
 */
export class KlineSession {
  private symbol: string;
  private interval: KlineInterval;
  private lastBar: KlineBar | null = null;
  private trend: number;
  private trendStrength: number;
  private basePrice: number;

  constructor(symbol: string, interval: KlineInterval, basePrice?: number) {
    this.symbol = symbol;
    this.interval = interval;

    // 如果没有提供 basePrice，从配置中获取
    if (basePrice === undefined) {
      const config = getPriceConfig(symbol);
      this.basePrice = config.basePrice;
    } else {
      this.basePrice = basePrice;
    }

    // 初始化随机趋势
    const trendParams = PriceGenerator.generateTrendParams();
    this.trend = trendParams.trend;
    this.trendStrength = trendParams.trendStrength;
  }

  /**
   * 生成历史 K线数据
   */
  generateHistory(limit: number, before?: number): KlineBar[] {
    const bars: KlineBar[] = [];
    const intervalSeconds = TimeAlignmentUtil.getIntervalSeconds(this.interval);

    // 使用统一的时间对齐逻辑
    const endTime = TimeAlignmentUtil.getHistoryEndTime(this.interval, before);

    // ⚠️ 关键修复：如果 Session 已有 lastBar，保持价格连续性
    // 不重置状态，让新生成的数据基于现有价格
    const shouldPreservePrice = this.lastBar !== null;

    if (!shouldPreservePrice) {
      // 只在首次生成时重置状态
      this.lastBar = null;
      const trendParams = PriceGenerator.generateTrendParams();
      this.trend = trendParams.trend;
      this.trendStrength = trendParams.trendStrength;
    } else {
      console.info('[KlineSession] 保持价格连续性，基于现有 lastBar:', this.lastBar?.close);
    }

    // 生成历史数据
    for (let i = limit - 1; i >= 0; i--) {
      const time = endTime - i * intervalSeconds;
      const bar = this.generateBar(time);
      bars.push(bar);

      // 模拟市场趋势变化
      if (PriceGenerator.shouldChangeTrend()) {
        const newTrendParams = PriceGenerator.generateTrendParams();
        this.trend = newTrendParams.trend;
        this.trendStrength = newTrendParams.trendStrength;
      }
    }

    return bars;
  }

  /**
   * 生成实时更新的 K线
   * @param barTime 明确指定的 bar 时间戳
   */
  generateRealtimeUpdate(barTime: number): KlineBar {
    // 验证时间戳的有效性
    if (this.lastBar && !TimeAlignmentUtil.validateBarTime(barTime, this.lastBar.time)) {
      console.error(
        `[KlineSession] Invalid bar time: ${barTime} < lastBar.time: ${this.lastBar.time}`,
      );
      throw new Error(`Invalid bar time: ${barTime} < lastBar.time: ${this.lastBar.time}`);
    }

    // 如果是更新当前 bar（时间相同）
    if (this.lastBar && barTime === this.lastBar.time) {
      return this.updateCurrentBar(barTime);
    }

    // 否则生成新的 bar
    return this.generateBar(barTime);
  }

  /**
   * 更新当前 K线（时间不变，更新价格）
   */
  private updateCurrentBar(barTime: number): KlineBar {
    if (!this.lastBar) {
      return this.generateBar(barTime);
    }

    // 使用专门的更新方法，保持 open 不变
    const priceData = PriceGenerator.generateUpdate(
      this.lastBar.open,
      this.lastBar.high,
      this.lastBar.low,
      this.lastBar.volume,
      this.trend,
      this.trendStrength,
    );

    const bar: KlineBar = {
      time: barTime,
      ...priceData,
    };

    this.lastBar = bar;
    return bar;
  }

  /**
   * 生成新的 K线
   */
  private generateBar(time: number): KlineBar {
    const prevClose = this.lastBar?.close || this.basePrice;
    const priceData = PriceGenerator.generate(prevClose, this.trend, this.trendStrength);

    const bar: KlineBar = {
      time,
      ...priceData,
    };

    this.lastBar = bar;
    return bar;
  }

  /**
   * 获取最后一根 K线
   */
  getLastBar(): KlineBar | null {
    return this.lastBar;
  }

  /**
   * 设置最后一根 K线（用于 WebSocket 订阅初始化）
   * 确保 Session 基于正确的历史价格继续生成
   */
  setLastBar(bar: KlineBar): void {
    this.lastBar = bar;
    // 同时更新 basePrice，确保后续生成基于正确的价格
    this.basePrice = bar.close;
    console.info(`[KlineSession] setLastBar: close=${bar.close}, time=${bar.time}`);
  }

  /**
   * 重置会话状态
   */
  reset(): void {
    this.lastBar = null;
    const trendParams = PriceGenerator.generateTrendParams();
    this.trend = trendParams.trend;
    this.trendStrength = trendParams.trendStrength;
  }

  /**
   * 获取会话信息（用于调试）
   */
  getInfo() {
    return {
      symbol: this.symbol,
      interval: this.interval,
      hasLastBar: Boolean(this.lastBar),
      lastBarTime: this.lastBar?.time,
      trend: this.trend,
      trendStrength: this.trendStrength,
    };
  }
}
