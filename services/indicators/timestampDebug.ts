/**
 * 时间戳诊断工具
 * 用于检查 K 线和指标数据的时间戳格式是否匹配
 */

export function diagnoseTimestamps() {
  console.group('🕐 时间戳诊断');

  // 1. 检查当前图表的 K 线数据
  console.info('1️⃣ 检查 K 线数据时间戳格式');

  // 模拟从 store 获取数据
  const sampleBar = {
    time: 1787274000,
    close: 50000,
  };

  console.info('K 线样本:', {
    time: sampleBar.time,
    timeType: typeof sampleBar.time,
    isInteger: Number.isInteger(sampleBar.time),
    readableUTC: new Date(sampleBar.time * 1000).toISOString(),
    readableLocal: new Date(sampleBar.time * 1000).toLocaleString(),
  });

  // 2. 测试 lightweight-charts 的时间格式要求
  console.info('2️⃣ lightweight-charts 时间格式要求');
  console.info('支持的格式:');
  console.info('- UTC 时间戳（秒）: 1729425600');
  console.info('- 日期字符串: "2024-10-20"');
  console.info('- 不支持毫秒时间戳!');

  // 3. 检查时间戳转换
  console.info('3️⃣ 时间戳转换测试');

  const testTime = 1787274000;
  const conversions = {
    原始值: testTime,
    类型: typeof testTime,
    转为数字: Number(testTime),
    转为字符串: String(testTime),
    转为Date: new Date(testTime * 1000),
    转为ISO: new Date(testTime * 1000).toISOString(),
    转为YYYY_MM_DD: new Date(testTime * 1000).toISOString().split('T')[0],
  };

  console.table(conversions);

  // 4. 检查时间戳连续性
  console.info('4️⃣ 检查时间戳连续性');

  const times = [1787274000, 1787277600, 1787281200];
  const gaps = times.map((t, i) => {
    if (i === 0) {return null;}
    const gap = t - times[i - 1];
    return {
      from: new Date(times[i - 1] * 1000).toLocaleTimeString(),
      to: new Date(t * 1000).toLocaleTimeString(),
      gap: gap,
      expected: '3600s (1h)',
      match: gap === 3600 ? '✅' : '❌',
    };
  }).filter(Boolean);

  console.table(gaps);

  console.groupEnd();
}

// 自动执行诊断
if (typeof window !== 'undefined') {
  (window as any).__diagnoseTimestamps__ = diagnoseTimestamps;
  console.info('💡 提示：在控制台执行 window.__diagnoseTimestamps__() 来诊断时间戳');
}
