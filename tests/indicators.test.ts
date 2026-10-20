/**
 * 技术指标计算器测试
 */

import { calculateMA, calculateMultiMA } from '../services/indicators/calculators/MA';
import { calculateEMA } from '../services/indicators/calculators/EMA';
import { calculateBOLL } from '../services/indicators/calculators/BOLL';
import { calculateRSI } from '../services/indicators/calculators/RSI';
import { calculateMACD } from '../services/indicators/calculators/MACD';
import { calculateKDJ } from '../services/indicators/calculators/KDJ';
import { KlineBar } from '../types/market';

// 生成测试数据
function generateTestBars(count: number): KlineBar[] {
  const bars: KlineBar[] = [];
  let basePrice = 50000;
  const startTime = Math.floor(Date.now() / 1000) - count * 3600;

  for (let i = 0; i < count; i++) {
    const change = (Math.random() - 0.5) * 1000;
    basePrice += change;

    const open = basePrice;
    const close = basePrice + (Math.random() - 0.5) * 500;
    const high = Math.max(open, close) + Math.random() * 200;
    const low = Math.min(open, close) - Math.random() * 200;

    bars.push({
      time: startTime + i * 3600,
      open,
      high,
      low,
      close,
      volume: Math.random() * 1000000,
    });
  }

  return bars;
}

// 测试各个指标计算器
describe('技术指标计算器测试', () => {
  const testBars = generateTestBars(100);

  test('MA 计算应该返回正确数量的数据点', () => {
    const period = 20;
    const maData = calculateMA(testBars, period);

    expect(maData.length).toBe(testBars.length - period + 1);
    expect(maData[0].time).toBe(testBars[period - 1].time);
  });

  test('多周期 MA 计算应该返回所有周期的数据', () => {
    const periods = [5, 10, 20, 30];
    const multiMA = calculateMultiMA(testBars, periods);

    expect(Object.keys(multiMA)).toHaveLength(periods.length);
    expect(multiMA['MA5']).toBeDefined();
    expect(multiMA['MA10']).toBeDefined();
    expect(multiMA['MA20']).toBeDefined();
    expect(multiMA['MA30']).toBeDefined();
  });

  test('EMA 计算应该返回正确的数据', () => {
    const period = 12;
    const emaData = calculateEMA(testBars, period);

    expect(emaData.length).toBeGreaterThan(0);
    expect(emaData[0].time).toBe(testBars[period - 1].time);
  });

  test('BOLL 计算应该返回上中下三轨', () => {
    const period = 20;
    const stdDev = 2;
    const bollData = calculateBOLL(testBars, period, stdDev);

    expect(bollData.length).toBeGreaterThan(0);
    expect(bollData[0].values).toHaveProperty('upper');
    expect(bollData[0].values).toHaveProperty('middle');
    expect(bollData[0].values).toHaveProperty('lower');

    // 上轨应该大于中轨，中轨应该大于下轨
    bollData.forEach((item) => {
      expect(item.values.upper).toBeGreaterThan(item.values.middle);
      expect(item.values.middle).toBeGreaterThan(item.values.lower);
    });
  });

  test('RSI 计算应该返回 0-100 之间的值', () => {
    const period = 14;
    const rsiData = calculateRSI(testBars, period);

    expect(rsiData.length).toBeGreaterThan(0);
    rsiData.forEach((item) => {
      expect(item.value).toBeGreaterThanOrEqual(0);
      expect(item.value).toBeLessThanOrEqual(100);
    });
  });

  test('MACD 计算应该返回 DIF、DEA 和 MACD 柱', () => {
    const macdData = calculateMACD(testBars, 12, 26, 9);

    expect(macdData.length).toBeGreaterThan(0);
    expect(macdData[0].values).toHaveProperty('dif');
    expect(macdData[0].values).toHaveProperty('dea');
    expect(macdData[0].values).toHaveProperty('macd');
  });

  test('KDJ 计算应该返回 K、D、J 值', () => {
    const kdjData = calculateKDJ(testBars, 9, 3, 3);

    expect(kdjData.length).toBeGreaterThan(0);
    expect(kdjData[0].values).toHaveProperty('k');
    expect(kdjData[0].values).toHaveProperty('d');
    expect(kdjData[0].values).toHaveProperty('j');
  });

  test('数据不足时应该返回空数组', () => {
    const shortBars = generateTestBars(5);

    const ma20 = calculateMA(shortBars, 20);
    const ema12 = calculateEMA(shortBars, 12);
    const boll = calculateBOLL(shortBars, 20, 2);

    expect(ma20.length).toBe(0);
    expect(ema12.length).toBe(0);
    expect(boll.length).toBe(0);
  });
});

console.log('✅ 技术指标计算器测试完成');
