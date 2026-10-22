# 指标显示为直线问题 - 故障排查指南

## 问题现象
技术指标（MA、EMA、BOLL 等）在图表上显示为一条水平直线，而不是随价格波动的曲线。

## 可能的原因

### 1. **数据问题**
- ✅ K 线数据本身没有波动（所有收盘价相同）
- ✅ 数据量不足（小于指标计算周期）
- ✅ 时间戳格式错误

### 2. **计算问题**
- ✅ 指标计算逻辑错误
- ✅ 数据类型转换问题（Number/String）

### 3. **渲染问题**
- ✅ 时间轴映射错误
- ✅ 价格轴范围设置不当
- ✅ 数据未正确传递到图表

## 诊断步骤

### Step 1: 检查 K 线数据
打开浏览器控制台，查看 K 线数据：
```javascript
// 应该看到价格有波动
bars: [{time: 1729425600, close: 50123.45}, {time: 1729429200, close: 50245.67}, ...]
```

### Step 2: 检查指标计算结果
启用 MA 指标后，查看控制台：
```javascript
[MA] ✅ MA5 计算正常
  points: 95
  firstValue: 50123.45
  lastValue: 50789.23
  range: { min: 49856.12, max: 51234.56 }
```

如果看到：
```javascript
[MA] ⚠️ 所有 MA5 值都相同!
  sampleValues: [50000, 50000, 50000, 50000, 50000]
```
说明 K 线数据本身没有波动。

### Step 3: 检查时间戳
```javascript
// 时间戳应该是递增的，且间隔正确
time: 1729425600 (2024-10-20 10:00:00)
time: 1729429200 (2024-10-20 11:00:00)  // 间隔 3600 秒 = 1 小时
```

### Step 4: 检查渲染数据
```javascript
[IndicatorManager] MA 计算完成
  seriesCount: 4
  dataPoints: 95
  sampleData: [
    {time: 1729425600, value: 50123.45},
    {time: 1729429200, value: 50245.67},
    {time: 1729432800, value: 50189.34}
  ]
```

## 快速修复方案

### 方案 1: 清除缓存并重新加载
```javascript
// 在浏览器控制台执行
localStorage.clear();
location.reload();
```

### 方案 2: 检查 Mock 数据生成器
如果使用 Mock 数据，确认 `PriceGenerator` 正在生成有波动的价格：
```typescript
// services/mock/kline/PriceGenerator.ts
const trendMove = trend * trendStrength * 0.01;  // ✅ 应该有波动
const randomMove = (Math.random() - 0.5) * 0.02; // ✅ 随机噪音
```

### 方案 3: 手动验证指标计算
在浏览器控制台执行：
```javascript
// 获取当前 K 线数据
const bars = window.__KLINE_BARS__ || [];
console.log('K线数据:', bars.slice(0, 5));

// 手动计算 MA5
const ma5 = [];
for (let i = 4; i < Math.min(10, bars.length); i++) {
  const sum = bars.slice(i-4, i+1).reduce((acc, b) => acc + b.close, 0);
  ma5.push({ time: bars[i].time, value: sum / 5 });
}
console.log('手动计算 MA5:', ma5);
```

## 常见问题解决

### 问题 1: 所有指标值都相同
**原因**: K 线数据没有波动
**解决**: 检查数据源，确认价格生成器正常工作

### 问题 2: 指标线不显示
**原因**: 时间戳格式不匹配
**解决**: 确认时间戳是**秒级 Unix 时间戳**，不是毫秒级

### 问题 3: 指标线位置错误
**原因**: 价格轴范围设置问题
**解决**: 
```typescript
// 在 IndicatorManager.ts 的 renderIndicator 方法中
// 主图指标使用 'right' priceScaleId
// 副图指标使用 'left' priceScaleId
```

### 问题 4: 指标不更新
**原因**: useEffect 依赖项配置错误
**解决**: 已修复，只监听 `configs` 和 `bars.length`

## 调试技巧

### 1. 启用详细日志
已在以下文件添加调试日志：
- `services/indicators/calculators/MA.ts`
- `services/indicators/IndicatorManager.ts`
- `components/Chart/hooks/useIndicators.ts`

### 2. 使用浏览器开发者工具
1. 打开 Chrome DevTools (F12)
2. 切换到 Console 标签
3. 启用 MA 指标
4. 查看日志输出

### 3. 检查 lightweight-charts 实例
```javascript
// 在浏览器控制台
const chart = window.__CHART_INSTANCE__;
const series = chart.series();
console.log('图表系列:', series);
```

## 预期行为

### 正常的指标显示
- ✅ 指标线随价格波动
- ✅ 不同周期的 MA 线有明显差异
- ✅ BOLL 上中下轨分离
- ✅ RSI 在 0-100 之间波动

### 异常的指标显示
- ❌ 所有指标线都是水平线
- ❌ 指标值完全相同
- ❌ 指标不显示或不可见

## 联系支持

如果以上方法都无法解决问题，请提供：
1. 浏览器控制台完整日志
2. K 线数据样本（前 10 条）
3. 指标配置信息
4. 截图

---

**更新时间**: 2024-10-20
**状态**: 故障排查中
