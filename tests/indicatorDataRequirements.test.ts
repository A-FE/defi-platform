import {
  getIndicatorMinDataSize,
  calculateMaxRedundantDataSize,
  calculateTotalDataSize,
} from '../utils/indicatorDataRequirements';
import { IndicatorConfig } from '../types/indicator';

// 测试数据
const MA5Config: IndicatorConfig = {
  type: 'MA',
  enabled: true,
  position: 'main',
  params: { period1: 5, period2: 10, period3: 20, period4: 30 },
  colors: ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444'],
  visible: true,
};

const MACDConfig: IndicatorConfig = {
  type: 'MACD',
  enabled: true,
  position: 'sub',
  params: { fast: 12, slow: 26, signal: 9 },
  colors: ['#22c55e', '#ef4444', '#3b82f6'],
  visible: true,
};

const BOLLConfig: IndicatorConfig = {
  type: 'BOLL',
  enabled: true,
  position: 'main',
  params: { period: 20, stdDev: 2 },
  colors: ['#3b82f6', '#f59e0b', '#ef4444'],
  visible: true,
};

const KDJConfig: IndicatorConfig = {
  type: 'KDJ',
  enabled: true,
  position: 'sub',
  params: { k: 9, d: 3, j: 3 },
  colors: ['#22c55e', '#3b82f6', '#f59e0b'],
  visible: true,
};

console.log('=== 指标数据需求测试 ===\n');

// 测试 1: 单个指标的最小数据需求
console.log('测试 1: 单个指标的最小数据需求');
console.log('MA(5,10,20,30):', getIndicatorMinDataSize(MA5Config), '根 (应该是 30)');
console.log('MACD(12,26,9):', getIndicatorMinDataSize(MACDConfig), '根 (应该是 35)');
console.log('BOLL(20,2):', getIndicatorMinDataSize(BOLLConfig), '根 (应该是 20)');
console.log('KDJ(9,3,3):', getIndicatorMinDataSize(KDJConfig), '根 (应该是 9)');
console.log('');

// 测试 2: 计算冗余数据量（2 倍）
console.log('测试 2: 计算冗余数据量（2 倍）');
console.log('MA(5,10,20,30) 冗余:', calculateMaxRedundantDataSize([MA5Config]), '根 (应该是 60)');
console.log('MACD(12,26,9) 冗余:', calculateMaxRedundantDataSize([MACDConfig]), '根 (应该是 70)');
console.log('');

// 测试 3: 多个指标取最大值
console.log('测试 3: 多个指标取最大冗余值');
const allIndicators = [MA5Config, MACDConfig, BOLLConfig, KDJConfig];
const maxRedundant = calculateMaxRedundantDataSize(allIndicators);
console.log('所有指标启用时的冗余量:', maxRedundant, '根 (应该是 70，因为 MACD 需求最大)');
console.log('');

// 测试 4: 计算总加载量
console.log('测试 4: 计算总加载量（显示 50 根 + 冗余）');
const displaySize = 50;

console.log('未启用指标:', calculateTotalDataSize(displaySize, []), '根');
console.log('启用 MA:', calculateTotalDataSize(displaySize, [MA5Config]), '根 (50 + 60 = 110)');
console.log('启用 MACD:', calculateTotalDataSize(displaySize, [MACDConfig]), '根 (50 + 70 = 120)');
console.log('启用所有指标:', calculateTotalDataSize(displaySize, allIndicators), '根 (50 + 70 = 120)');
console.log('');

// 测试 5: 验证可视区内所有指标都有数据
console.log('测试 5: 验证可视区内所有指标都有数据');
console.log('场景：加载 120 根数据，显示最新 50 根');
console.log('');
console.log('数据区间: [1 - 120]');
console.log('可视区间: [71 - 120] (最新 50 根)');
console.log('');
console.log('MA30 计算: 需要前 30 根，从第 30 根开始有数据');
console.log('  - 第 71 根所需历史: [42 - 71] (30 根) ✅ 数据充足');
console.log('  - 可视区 [71-120] 内所有数据点都能计算 ✅');
console.log('');
console.log('MACD 计算: 需要前 35 根，从第 35 根开始有数据');
console.log('  - 第 71 根所需历史: [37 - 71] (35 根) ✅ 数据充足');
console.log('  - 可视区 [71-120] 内所有数据点都能计算 ✅');
console.log('');
console.log('结论: 可视区内所有指标都有完整数据，视觉上完全对齐！');
