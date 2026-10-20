/**
 * 指标调试工具
 * 用于诊断指标显示为直线的问题
 */

import { KlineBar } from '@/types/market';
import { calculateMA } from '@/services/indicators/calculators/MA';
import { calculateEMA } from '@/services/indicators/calculators/EMA';
import { calculateBOLL } from '@/services/indicators/calculators/BOLL';

// 生成测试数据
function generateTestData(count: number = 100): KlineBar[] {
  const bars: KlineBar[] = [];
  let basePrice = 50000;
  const startTime = Math.floor(Date.now() / 1000) - count * 3600;

  for (let i = 0; i < count; i++) {
    // 生成有波动的价格
    const change = (Math.random() - 0.5) * 2000;
    basePrice += change;

    const open = basePrice;
    const close = basePrice + (Math.random() - 0.5) * 1000;
    const high = Math.max(open, close) + Math.random() * 500;
    const low = Math.min(open, close) - Math.random() * 500;

    bars.push({
      time: startTime + i * 3600,
      open,
      high,
      low,
      close,
      volume: 1000000 + Math.random() * 500000,
    });
  }

  return bars;
}

// 诊断函数
export function diagnoseIndicators() {
  console.group('🔍 指标诊断开始');

  const testBars = generateTestData(100);

  console.log('📊 测试数据:', {
    count: testBars.length,
    firstBar: {
      time: testBars[0].time,
      timeReadable: new Date(testBars[0].time * 1000).toISOString(),
      price: testBars[0].close,
    },
    lastBar: {
      time: testBars[testBars.length - 1].time,
      timeReadable: new Date(testBars[testBars.length - 1].time * 1000).toISOString(),
      price: testBars[testBars.length - 1].close,
    },
    priceRange: {
      min: Math.min(...testBars.map(b => b.low)),
      max: Math.max(...testBars.map(b => b.high)),
    },
  });

  // 测试 MA
  console.group('📈 MA 指标测试');
  const ma5 = calculateMA(testBars, 5);
  const ma20 = calculateMA(testBars, 20);

  console.log('MA5 结果:', {
    dataPoints: ma5.length,
    firstPoint: ma5[0],
    lastPoint: ma5[ma5.length - 1],
    values: ma5.slice(0, 5).map(d => d.value),
    allSame: ma5.every((d, i, arr) => i === 0 || Math.abs(d.value - arr[i - 1].value) < 0.01),
  });

  console.log('MA20 结果:', {
    dataPoints: ma20.length,
    firstPoint: ma20[0],
    lastPoint: ma20[ma20.length - 1],
    values: ma20.slice(0, 5).map(d => d.value),
    allSame: ma20.every((d, i, arr) => i === 0 || Math.abs(d.value - arr[i - 1].value) < 0.01),
  });

  console.groupEnd();

  // 测试 EMA
  console.group('📈 EMA 指标测试');
  const ema12 = calculateEMA(testBars, 12);

  console.log('EMA12 结果:', {
    dataPoints: ema12.length,
    firstPoint: ema12[0],
    lastPoint: ema12[ema12.length - 1],
    values: ema12.slice(0, 5).map(d => d.value),
    allSame: ema12.every((d, i, arr) => i === 0 || Math.abs(d.value - arr[i - 1].value) < 0.01),
  });

  console.groupEnd();

  // 测试 BOLL
  console.group('📈 BOLL 指标测试');
  const boll = calculateBOLL(testBars, 20, 2);

  console.log('BOLL 结果:', {
    dataPoints: boll.length,
    firstPoint: boll[0],
    lastPoint: boll[boll.length - 1],
    upperValues: boll.slice(0, 3).map(d => d.values.upper),
    middleValues: boll.slice(0, 3).map(d => d.values.middle),
    lowerValues: boll.slice(0, 3).map(d => d.values.lower),
    allSame: boll.every((d, i, arr) => i === 0 || Math.abs(d.values.middle - arr[i - 1].values.middle) < 0.01),
  });

  console.groupEnd();

  // 检查时间戳连续性
  console.group('⏰ 时间戳检查');
  const timeGaps = [];
  for (let i = 1; i < ma20.length; i++) {
    const gap = ma20[i].time - ma20[i - 1].time;
    if (gap !== 3600) {
      timeGaps.push({ index: i, gap, expected: 3600 });
    }
  }

  console.log('时间戳连续性:', {
    totalPoints: ma20.length,
    gaps: timeGaps.length,
    sampleGaps: timeGaps.slice(0, 5),
  });

  console.groupEnd();

  console.groupEnd();
}
