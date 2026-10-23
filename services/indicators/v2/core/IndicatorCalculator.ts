/**
 * 指标计算器（V2）
 * 职责：纯计算逻辑，无副作用，易于测试
 *
 * ✅ 优势：
 * 1. 纯函数，易于测试（无需 chart 实例）
 * 2. 可以独立使用（Web Worker 中计算）
 * 3. 性能优化空间大（缓存、增量计算）
 */

import { Time } from 'lightweight-charts';
import { KlineBar } from '@/types/market';
import { IndicatorConfig, IndicatorDataPoint } from '../types';
import * as calculators from '../../calculators';

export class IndicatorCalculator {
  /**
   * 计算单个指标
   * @param bars 原始 K线数据
   * @param config 指标配置
   * @returns 指标数据数组
   */
  calculate(bars: KlineBar[], config: IndicatorConfig): IndicatorDataPoint[] {
    try {
      switch (config.type) {
        case 'MA':
          return this.calculateMA(bars, config.params);
        case 'EMA':
          return this.calculateEMA(bars, config.params);
        case 'BOLL':
          return this.calculateBOLL(bars, config.params);
        case 'RSI':
          return this.calculateRSI(bars, config.params);
        case 'MACD':
          return this.calculateMACD(bars, config.params);
        case 'KDJ':
          return this.calculateKDJ(bars, config.params);
        case 'VOL':
          return this.calculateVOL(bars);
        default:
          console.warn(`[IndicatorCalculator] Unknown indicator type: ${config.type}`);
          return [];
      }
    } catch (error) {
      console.error(`[IndicatorCalculator] Failed to calculate ${config.type}:`, error);
      return [];
    }
  }

  /**
   * 批量计算多个指标
   * @param bars 原始 K线数据
   * @param configs 指标配置列表
   * @returns Map<指标类型, 指标数据>
   */
  calculateBatch(
    bars: KlineBar[],
    configs: IndicatorConfig[],
  ): Map<string, IndicatorDataPoint[]> {
    const result = new Map<string, IndicatorDataPoint[]>();

    configs.forEach((config) => {
      const data = this.calculate(bars, config);
      result.set(config.type, data);
    });

    return result;
  }

  // ==================== 各指标计算方法 ====================

  private calculateMA(bars: KlineBar[], params: Record<string, number>): IndicatorDataPoint[] {
    const periods = Object.values(params);
    const result = calculators.calculateMultiMA(bars, periods);

    // 转换为统一的 IndicatorDataPoint 格式
    const dataPoints: IndicatorDataPoint[] = [];
    const timeSet = new Set<number>();

    // 收集所有时间点
    Object.values(result).forEach((lineData) => {
      lineData.forEach((d) => timeSet.add(d.time as number));
    });

    // 为每个时间点构建数据
    Array.from(timeSet)
      .sort((a, b) => a - b)
      .forEach((time) => {
        const values: Record<string, number> = {};

        Object.entries(result).forEach(([key, lineData]) => {
          const point = lineData.find((d) => d.time === time);
          if (point) {
            values[key.toLowerCase()] = point.value;
          }
        });

        if (Object.keys(values).length > 0) {
          dataPoints.push({ time: time as Time, values });
        }
      });

    return dataPoints;
  }

  private calculateEMA(bars: KlineBar[], params: Record<string, number>): IndicatorDataPoint[] {
    const periods = Object.values(params);
    const result = calculators.calculateMultiEMA(bars, periods);

    const dataPoints: IndicatorDataPoint[] = [];
    const timeSet = new Set<number>();

    Object.values(result).forEach((lineData) => {
      lineData.forEach((d) => timeSet.add(d.time as number));
    });

    Array.from(timeSet)
      .sort((a, b) => a - b)
      .forEach((time) => {
        const values: Record<string, number> = {};

        Object.entries(result).forEach(([key, lineData]) => {
          const point = lineData.find((d) => d.time === time);
          if (point) {
            values[key.toLowerCase()] = point.value;
          }
        });

        if (Object.keys(values).length > 0) {
          dataPoints.push({ time: time as Time, values });
        }
      });

    return dataPoints;
  }

  private calculateBOLL(bars: KlineBar[], params: Record<string, number>): IndicatorDataPoint[] {
    const { period = 20, stdDev = 2 } = params;
    const result = calculators.calculateBOLL(bars, period, stdDev);

    return result.map((item) => ({
      time: item.time as Time,
      values: {
        upper: item.values.upper,
        middle: item.values.middle,
        lower: item.values.lower,
      },
    }));
  }

  private calculateRSI(bars: KlineBar[], params: Record<string, number>): IndicatorDataPoint[] {
    const periods = Object.values(params);
    const result = calculators.calculateMultiRSI(bars, periods);

    const dataPoints: IndicatorDataPoint[] = [];
    const timeSet = new Set<number>();

    Object.values(result).forEach((lineData) => {
      lineData.forEach((d) => timeSet.add(d.time as number));
    });

    Array.from(timeSet)
      .sort((a, b) => a - b)
      .forEach((time) => {
        const values: Record<string, number> = {};

        Object.entries(result).forEach(([key, lineData]) => {
          const point = lineData.find((d) => d.time === time);
          if (point) {
            values[key.toLowerCase()] = point.value;
          }
        });

        if (Object.keys(values).length > 0) {
          dataPoints.push({ time: time as Time, values });
        }
      });

    return dataPoints;
  }

  private calculateMACD(bars: KlineBar[], params: Record<string, number>): IndicatorDataPoint[] {
    const { fast = 12, slow = 26, signal = 9 } = params;
    const result = calculators.calculateMACD(bars, fast, slow, signal);

    return result.map((item) => ({
      time: item.time as Time,
      values: {
        dif: item.values.dif,
        dea: item.values.dea,
        macd: item.values.macd,
      },
    }));
  }

  private calculateKDJ(bars: KlineBar[], params: Record<string, number>): IndicatorDataPoint[] {
    const { period = 9, k = 3, d = 3 } = params;
    const result = calculators.calculateKDJ(bars, period, k, d);

    return result.map((item) => ({
      time: item.time as Time,
      values: {
        k: item.values.k,
        d: item.values.d,
        j: item.values.j,
      },
    }));
  }

  private calculateVOL(bars: KlineBar[]): IndicatorDataPoint[] {
    // VOL 直接使用 K线的 volume 字段
    return bars
      .filter((bar) => bar.volume !== undefined)
      .map((bar) => ({
        time: bar.time as Time,
        values: {
          volume: bar.volume,
          color: bar.close >= bar.open ? 'up' : 'down',
        },
      }));
  }
}
