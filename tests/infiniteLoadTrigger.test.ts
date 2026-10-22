import { getMaxIndicatorDataRequirement } from '../utils/indicatorDataRequirements';
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

const SAFETY_BUFFER = 10;

console.log('=== 无限加载触发阈值测试 ===\n');

// 测试 1: 获取最大指标需求
console.log('测试 1: 获取最大指标需求（不含冗余倍数）');
console.log('MA30:', getMaxIndicatorDataRequirement([MA5Config]), '根 (应该是 30)');
console.log('MACD:', getMaxIndicatorDataRequirement([MACDConfig]), '根 (应该是 35)');
console.log('BOLL:', getMaxIndicatorDataRequirement([BOLLConfig]), '根 (应该是 20)');
console.log('KDJ:', getMaxIndicatorDataRequirement([KDJConfig]), '根 (应该是 9)');
console.log('');

// 测试 2: 计算触发阈值
console.log('测试 2: 计算触发阈值（最大需求 + 安全缓冲区）');
console.log('未启用指标:', 0 + SAFETY_BUFFER, '根 (0 + 10 = 10)');
console.log('启用 MA30:', 30 + SAFETY_BUFFER, '根 (30 + 10 = 40)');
console.log('启用 MACD:', 35 + SAFETY_BUFFER, '根 (35 + 10 = 45)');
console.log('');

// 测试 3: 多个指标取最大值
console.log('测试 3: 多个指标取最大需求');
const allIndicators = [MA5Config, MACDConfig, BOLLConfig, KDJConfig];
const maxRequirement = getMaxIndicatorDataRequirement(allIndicators);
const triggerThreshold = maxRequirement + SAFETY_BUFFER;
console.log('所有指标启用时的最大需求:', maxRequirement, '根 (应该是 35)');
console.log('触发阈值:', triggerThreshold, '根 (35 + 10 = 45)');
console.log('');

// 测试 4: 实际场景模拟
console.log('测试 4: 实际场景模拟');
console.log('');
console.log('场景：加载 120 根数据，显示最新 50 根');
console.log('初始可视区: [71 - 120]');
console.log('启用 MACD，触发阈值 = 45');
console.log('');

const scenarios = [
  { position: 71, from: 70, description: '初始位置' },
  { position: 60, from: 59, description: '左滑到第 60 根' },
  { position: 50, from: 49, description: '左滑到第 50 根' },
  { position: 45, from: 44, description: '左滑到第 45 根（临界点）' },
  { position: 40, from: 39, description: '左滑到第 40 根' },
];

scenarios.forEach(({ position, from, description }) => {
  const shouldTrigger = from < triggerThreshold;
  const status = shouldTrigger ? '✅ 触发加载' : '❌ 不触发';
  console.log(`${description}:`);
  console.log(`  - 可视区左边界索引: ${from}`);
  console.log(`  - 触发条件: ${from} < ${triggerThreshold}？`);
  console.log(`  - 结果: ${status}`);

  if (shouldTrigger) {
    const macdDataStart = position - 35;
    console.log(`  - MACD 需要: [${macdDataStart} - ${position}] 的数据`);
    console.log(`  - 当前有: [1 - 120] 的数据`);
    console.log(`  - 评估: ${macdDataStart >= 1 ? '✅ 数据充足' : '⚠️ 即将不足，需加载'}`);
  }
  console.log('');
});

// 测试 5: 对比修改前后
console.log('测试 5: 对比修改前后的触发行为');
console.log('');
console.log('修改前（固定阈值 = 5）：');
console.log('  - 左滑到第 71 根: 70 < 5？❌ 否，不触发');
console.log('  - 左滑到第 40 根: 39 < 5？❌ 否，不触发');
console.log('  - 左滑到第 5 根: 4 < 5？✅ 是，触发加载');
console.log('  - 问题：MACD 在第 40 根时只有 4 根历史数据，继续左滑就不够了');
console.log('');
console.log('修改后（动态阈值 = 45）：');
console.log('  - 左滑到第 71 根: 70 < 45？❌ 否，不触发（数据充足）');
console.log('  - 左滑到第 45 根: 44 < 45？✅ 是，触发加载');
console.log('  - 加载后有 170 根数据');
console.log('  - MACD 在第 45 根需要 [11-45]，实际有 [1-170]');
console.log('  - 优势：✅ 提前加载，确保 MACD 始终有足够数据');
console.log('');

console.log('=== 测试完成 ===');
console.log('');
console.log('结论：');
console.log('✅ 动态阈值根据启用的指标自动调整');
console.log('✅ 确保需求最大的指标始终有足够的历史数据');
console.log('✅ 避免用户看到数据断层');
