import { IndicatorKlineItem, IndicatorQueryParams } from '@/types/api';
// 临时引用旧的计算器用于 mock（后端接口就绪后将移除）
import * as calculators from '../indicators/calculators';

/**
 * Mock：模拟后端指标计算
 *
 * 开发阶段使用，用于：
 * 1. 在后端接口未就绪前，前端可以继续开发
 * 2. 测试新的数据流和渲染逻辑
 * 3. 验证 IndicatorManagerV2 的渲染功能
 *
 * ⚠️ 注意：后端接口就绪后，此文件将被移除
 */
export function mockCalculateIndicators(
  bars: IndicatorKlineItem[],  // ✅ 改为统一类型
  params: IndicatorQueryParams
): IndicatorKlineItem[] {
  console.log('[mockCalculateIndicators] Input:', {
    barsCount: bars.length,
    indicatorsCount: params.indicators.length,
    indicators: params.indicators.map(i => `${i.name}(${i.params.join(',')})`),
  });

  // 初始化结果：复制 K 线数据，添加空的 indicators 字段
  const result: IndicatorKlineItem[] = bars.map(bar => ({
    time: bar.time,
    open: bar.open,
    high: bar.high,
    low: bar.low,
    close: bar.close,
    volume: bar.volume,
    indicators: {},
  }));

  // 计算每个指标（使用旧的计算器，输入需要基础 OHLCV 数据）
  const simpleBars = bars.map(bar => ({
    time: bar.time,
    open: bar.open,
    high: bar.high,
    low: bar.low,
    close: bar.close,
    volume: bar.volume,
  }));

  params.indicators.forEach(indicator => {
    try {
      switch (indicator.name.toLowerCase()) {
        case 'macd': {
          const [fast, slow, signal] = indicator.params;
          const macdData = calculators.calculateMACD(simpleBars, fast, slow, signal);

          macdData.forEach((d) => {
            const matchedBar = result.find(r => r.time === d.time);
            if (matchedBar) {
              matchedBar.indicators.macd = {
                dif: d.values.dif,
                dea: d.values.dea,
                macd: d.values.macd,
              };
            }
          });

          console.log(`[mockCalculateIndicators] MACD calculated: ${macdData.length} points`);
          break;
        }

        case 'rsi': {
          const [period] = indicator.params;
          const rsiData = calculators.calculateRSI(simpleBars, period);

          rsiData.forEach(d => {
            const matchedBar = result.find(r => r.time === d.time);
            if (matchedBar) {
              matchedBar.indicators.rsi = { rsi: d.value };
            }
          });

          console.log(`[mockCalculateIndicators] RSI calculated: ${rsiData.length} points`);
          break;
        }

        case 'kdj': {
          const [period, kPeriod, dPeriod] = indicator.params;
          const kdjData = calculators.calculateKDJ(simpleBars, period, kPeriod, dPeriod);

          kdjData.forEach(d => {
            const matchedBar = result.find(r => r.time === d.time);
            if (matchedBar) {
              matchedBar.indicators.kdj = {
                k: d.values.k,
                d: d.values.d,
                j: d.values.j,
              };
            }
          });

          console.log(`[mockCalculateIndicators] KDJ calculated: ${kdjData.length} points`);
          break;
        }

        case 'boll': {
          const [period, stdDev] = indicator.params;
          const bollData = calculators.calculateBOLL(simpleBars, period, stdDev);

          bollData.forEach(d => {
            const matchedBar = result.find(r => r.time === d.time);
            if (matchedBar) {
              matchedBar.indicators.boll = {
                upper: d.values.upper,
                middle: d.values.middle,
                lower: d.values.lower,
              };
            }
          });

          console.log(`[mockCalculateIndicators] BOLL calculated: ${bollData.length} points`);
          break;
        }

        case 'ma': {
          const periods = indicator.params;
          const maData = calculators.calculateMultiMA(simpleBars, periods);

          // maData 结构：{ ma5: [{time, value}], ma10: [...] }
          Object.entries(maData).forEach(([key, data]) => {
            data.forEach((point: any) => {
              const matchedBar = result.find(r => r.time === point.time);
              if (matchedBar) {
                if (!matchedBar.indicators.ma) {
                  matchedBar.indicators.ma = {};
                }
                matchedBar.indicators.ma[key] = point.value;
              }
            });
          });

          console.log(`[mockCalculateIndicators] MA calculated: ${periods.length} lines`);
          break;
        }

        case 'ema': {
          const periods = indicator.params;
          const emaData = calculators.calculateMultiEMA(simpleBars, periods);

          // emaData 结构：{ ema5: [{time, value}], ema10: [...] }
          Object.entries(emaData).forEach(([key, data]) => {
            data.forEach((point: any) => {
              const matchedBar = result.find(r => r.time === point.time);
              if (matchedBar) {
                if (!matchedBar.indicators.ema) {
                  matchedBar.indicators.ema = {};
                }
                matchedBar.indicators.ema[key] = point.value;
              }
            });
          });

          console.log(`[mockCalculateIndicators] EMA calculated: ${periods.length} lines`);
          break;
        }

        case 'vol': {
          // VOL 不需要特殊计算，直接使用 volume 字段
          result.forEach(bar => {
            bar.indicators.vol = { volume: bar.volume };
          });

          console.log(`[mockCalculateIndicators] VOL mapped: ${result.length} points`);
          break;
        }

        default:
          console.warn(`[mockCalculateIndicators] Unknown indicator: ${indicator.name}`);
      }
    } catch (error) {
      console.error(`[mockCalculateIndicators] Failed to calculate ${indicator.name}:`, error);
    }
  });

  console.log('[mockCalculateIndicators] Output:', result);

  return result;
}
