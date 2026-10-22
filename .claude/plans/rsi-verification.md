# RSI 渲染验证计划

## 当前代码分析

### renderRSI 方法（第 829-869 行）

```typescript
periods.forEach((period, index) => {  // 🔄 循环 3 次: period1, period2, period3
  const rsiKey = `rsi${config.params[period]}`;  // rsi6, rsi12, rsi24
  const rsiData: LineData[] = [];
  
  bars.forEach((bar) => {
    if (bar.indicators.rsi && bar.indicators.rsi[rsiKey] !== undefined) {
      rsiData.push({ time: bar.time as any, value: bar.indicators.rsi[rsiKey] });
    }
  });
  
  if (rsiData.length > 0) {
    const rsiSeries = this.chart.addSeries(LineSeries, { ... }, paneIndex);  // ✅ 调用点
    rsiSeries.setData(rsiData);
    series.push(rsiSeries);
  }
});
```

## 验证结果

✅ **代码逻辑正确**：
- `periods` = `['period1', 'period2', 'period3']`（3 个元素）
- `forEach` 循环会执行 3 次
- 每次循环都会调用 `this.chart.addSeries(LineSeries, ...)`（如果有数据）

## 可能的误解

用户可能担心的问题：
1. **循环次数不够**？❌ 循环 3 次是正确的
2. **addSeries 只调用 1 次**？❌ 在循环内部，会调用 3 次
3. **数据不足导致跳过**？⚠️ 这是合理的保护机制

## 建议方案

### 方案 1: 保持现状（推荐）
代码逻辑正确，无需修改。如果用户实际运行时发现问题，添加调试日志定位。

### 方案 2: 添加详细日志
在 `renderRSI` 中添加日志，帮助验证执行情况：

```typescript
periods.forEach((period, index) => {
  console.log(`[RSI] Rendering period ${config.params[period]}, key: rsi${config.params[period]}`);
  // ...
  if (rsiData.length > 0) {
    console.log(`[RSI] ✅ Created series for RSI(${config.params[period]}), ${rsiData.length} points`);
    const rsiSeries = this.chart.addSeries(...);
  } else {
    console.warn(`[RSI] ⚠️ Skipped RSI(${config.params[period]}), no data`);
  }
});
```

## 结论

**当前实现与 MA 完全一致，逻辑正确。**如果用户确实看到了问题，需要：
1. 实际运行查看效果
2. 检查控制台日志
3. 确认 K 线数据是否足够（至少 25 根）
