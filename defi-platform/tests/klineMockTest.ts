/**
 * K线 Mock 系统测试
 * 验证时间戳一致性和周期切换
 */

import { klineSessionManager, TimeAlignmentUtil } from '../services/mock/kline';
import { KlineInterval } from '../types/market';

// 测试 1: 时间对齐一致性
function testTimeAlignment() {
  console.log('=== 测试 1: 时间对齐一致性 ===');

  const intervals: KlineInterval[] = ['1m', '5m', '15m', '1h', '4h', '1d', '1w'];

  intervals.forEach(interval => {
    const now = Math.floor(Date.now() / 1000);
    const aligned1 = TimeAlignmentUtil.alignToInterval(now, interval);
    const aligned2 = TimeAlignmentUtil.getCurrentAlignedTime(interval);

    console.log(`${interval}: aligned1=${aligned1}, aligned2=${aligned2}, 一致=${aligned1 === aligned2}`);
  });
}

// 测试 2: 历史数据时间戳单调性
function testHistoryMonotonicity() {
  console.log('\n=== 测试 2: 历史数据时间戳单调性 ===');

  const session = klineSessionManager.getOrCreateSession('BTCUSDT', '1h');
  const bars = session.generateHistory(10);

  let isMonotonic = true;
  for (let i = 1; i < bars.length; i++) {
    if (bars[i].time <= bars[i - 1].time) {
      console.error(`❌ 时间戳不单调: bars[${i}].time=${bars[i].time} <= bars[${i-1}].time=${bars[i-1].time}`);
      isMonotonic = false;
    }
  }

  if (isMonotonic) {
    console.log('✅ 历史数据时间戳单调递增');
  }

  console.log(`最后一根 bar 时间: ${bars[bars.length - 1].time}`);
  console.log(`当前对齐时间: ${TimeAlignmentUtil.getCurrentAlignedTime('1h')}`);

  klineSessionManager.destroySession('BTCUSDT', '1h');
}

// 测试 3: 实时更新时间戳有效性
function testRealtimeUpdates() {
  console.log('\n=== 测试 3: 实时更新时间戳有效性 ===');

  const session = klineSessionManager.getOrCreateSession('BTCUSDT', '5m');
  const bars = session.generateHistory(5);
  const lastBar = bars[bars.length - 1];

  console.log(`历史最后一根 bar 时间: ${lastBar.time}`);

  // 模拟 10 次实时更新
  let hasError = false;
  for (let i = 0; i < 10; i++) {
    const currentTime = TimeAlignmentUtil.getCurrentAlignedTime('5m');
    const newBar = session.generateRealtimeUpdate(currentTime);

    if (!TimeAlignmentUtil.validateBarTime(newBar.time, lastBar.time)) {
      console.error(`❌ 更新 ${i}: newBar.time=${newBar.time} < lastBar.time=${lastBar.time}`);
      hasError = true;
    }
  }

  if (!hasError) {
    console.log('✅ 实时更新时间戳全部有效');
  }

  klineSessionManager.destroySession('BTCUSDT', '5m');
}

// 测试 4: 周期切换状态隔离
function testIntervalSwitchIsolation() {
  console.log('\n=== 测试 4: 周期切换状态隔离 ===');

  // 创建 1h 会话
  const session1h = klineSessionManager.getOrCreateSession('BTCUSDT', '1h');
  const bars1h = session1h.generateHistory(5);
  const lastBar1h = bars1h[bars1h.length - 1];

  console.log(`1h 最后一根 bar 时间: ${lastBar1h.time}`);

  // 销毁 1h 会话，创建 5m 会话
  klineSessionManager.destroySession('BTCUSDT', '1h');

  const session5m = klineSessionManager.getOrCreateSession('BTCUSDT', '5m');
  const bars5m = session5m.generateHistory(5);
  const lastBar5m = bars5m[bars5m.length - 1];

  console.log(`5m 最后一根 bar 时间: ${lastBar5m.time}`);

  // 再次切换回 1h
  klineSessionManager.destroySession('BTCUSDT', '5m');

  const session1hNew = klineSessionManager.getOrCreateSession('BTCUSDT', '1h');
  const bars1hNew = session1hNew.generateHistory(5);
  const lastBar1hNew = bars1hNew[bars1hNew.length - 1];

  console.log(`1h (新) 最后一根 bar 时间: ${lastBar1hNew.time}`);

  // 验证新的 1h 会话与当前时间对齐
  const currentAligned = TimeAlignmentUtil.getCurrentAlignedTime('1h');
  if (lastBar1hNew.time === currentAligned) {
    console.log('✅ 周期切换后状态正确隔离，时间戳对齐');
  } else {
    console.error(`❌ 时间戳不对齐: lastBar=${lastBar1hNew.time}, current=${currentAligned}`);
  }

  klineSessionManager.clearAll();
}

// 测试 5: 数据连续性
function testDataContinuity() {
  console.log('\n=== 测试 5: 数据连续性 ===');

  const session = klineSessionManager.getOrCreateSession('BTCUSDT', '1h');
  const bars = session.generateHistory(10);

  let isContinuous = true;
  for (let i = 1; i < bars.length; i++) {
    // 允许微小的浮点误差
    const diff = Math.abs(bars[i].open - bars[i - 1].close);
    if (diff > 0.01) {
      console.error(`❌ 数据不连续: bars[${i}].open=${bars[i].open} != bars[${i-1}].close=${bars[i-1].close}`);
      isContinuous = false;
    }
  }

  if (isContinuous) {
    console.log('✅ K线数据连续性良好 (close → open)');
  }

  klineSessionManager.destroySession('BTCUSDT', '1h');
}

// 运行所有测试
export function runKlineMockTests() {
  console.log('🧪 开始 K线 Mock 系统测试\n');

  try {
    testTimeAlignment();
    testHistoryMonotonicity();
    testRealtimeUpdates();
    testIntervalSwitchIsolation();
    testDataContinuity();

    console.log('\n✅ 所有测试完成');
  } catch (error) {
    console.error('\n❌ 测试失败:', error);
  }
}

// 如果直接运行此文件
if (typeof window === 'undefined') {
  runKlineMockTests();
}
