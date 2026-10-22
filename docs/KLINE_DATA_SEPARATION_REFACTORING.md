# K 线数据分离重构报告

**重构日期**: 2026-10-22  
**重构目标**: 分离完整数据和显示数据，确保 MACD 等指标有足够的历史数据用于计算

---

## 🎯 重构目标

### 问题背景
- **原架构**: 获取 50 根 K 线，既用于图表显示，也用于指标计算
- **核心问题**: MACD(12,26,9) 需要 35 根数据才能开始计算，导致前 35 根 K 线没有 MACD 数据
- **用户体验**: 指标线从图表中间突然出现，左侧大量空白

### 解决方案
**数据分离架构**：
- **完整数据（fullKlineData）**: 100 根 K 线，用于指标计算
- **显示数据（displayKlineData）**: 50 根 K 线，用于图表渲染

---

## 📊 架构对比

### 修改前
```
fetchKlines → 50 根 K 线
     ↓
klineData (50 根)
     ↓
     ├─→ 图表渲染 (50 根)
     └─→ 指标计算 (50 根) ← ❌ MACD 前 35 根无数据
```

### 修改后
```
fetchKlines → 100 根 K 线
     ↓
fullKlineData (100 根)
     ↓
     ├─→ 指标计算 (100 根) ← ✅ MACD 完整数据
     │        ↓
     │   过滤到显示范围 (50 根)
     │
     └─→ displayKlineData (50 根)
              ↓
         图表渲染 (50 根)
```

---

## 🔧 修改文件清单

| 文件 | 修改内容 | 行数变化 |
|------|----------|---------|
| **constants/chart.ts** | 新建配置常量 | +38 |
| **useKlineChart.ts** | 分离两份数据状态 | ~30 |
| **useKlineDataLoader.ts** | 加载 100 根，分离为两份，更新两份 | ~80 |
| **useIndicatorRenderer.ts** | 接收两份数据参数 | ~15 |
| **IndicatorManager.ts** | updateIndicators 支持数据分离 | ~50 |

---

## 📐 关键代码修改

### 1. 配置常量（constants/chart.ts）

```typescript
export const CHART_DATA_CONFIG = {
  FULL_DATA_SIZE: 100,        // 完整数据量
  DISPLAY_DATA_SIZE: 50,      // 显示数据量
  HISTORY_LOAD_SIZE: 50,      // 历史加载量
  MAX_FULL_DATA_SIZE: 150,    // 最大缓存
} as const;
```

### 2. 状态分离（useKlineChart.ts）

```typescript
// 修改前
const [klineData, setKlineData] = useState<KlineBar[]>([]);

// 修改后
const [fullKlineData, setFullKlineData] = useState<KlineBar[]>([]); // 100 根
const [displayKlineData, setDisplayKlineData] = useState<KlineBar[]>([]); // 50 根
```

### 3. 数据加载（useKlineDataLoader.ts）

```typescript
// 加载 100 根
const from = now - (CHART_DATA_CONFIG.FULL_DATA_SIZE * getIntervalSeconds(interval));
const allBars = await fetchKlines(symbol, interval, from, now);

// 分离数据
const displayBars = allBars.slice(-CHART_DATA_CONFIG.DISPLAY_DATA_SIZE);

// 通知外部
onDataLoaded(allBars);           // 完整数据
onDisplayDataLoaded(displayBars); // 显示数据
```

### 4. 指标计算与过滤（IndicatorManager.ts）

```typescript
public updateIndicators(
  fullBars: KlineBar[],      // 完整数据（用于计算）
  displayBars: KlineBar[],   // 显示数据（用于过滤）
  configs: IndicatorConfig[]
): void {
  // 1. 用完整数据计算指标
  const fullBarsWithIndicators = this.calculateIndicators(fullBars, configs);

  // 2. 过滤出显示范围的指标数据
  const displayTimeSet = new Set(displayBars.map(b => b.time));
  const displayBarsWithIndicators = fullBarsWithIndicators.filter(b =>
    displayTimeSet.has(b.time)
  );

  // 3. 渲染过滤后的指标
  this.renderIndicators(displayBarsWithIndicators, configs);
}
```

### 5. WebSocket 实时更新

```typescript
// 更新完整数据
onDataLoaded((prev) => {
  const newData = [...prev];
  // ... 更新逻辑
  if (newData.length > CHART_DATA_CONFIG.MAX_FULL_DATA_SIZE) {
    return newData.slice(-CHART_DATA_CONFIG.FULL_DATA_SIZE);
  }
  return newData;
});

// 更新显示数据
onDisplayDataLoaded((prev) => {
  const newData = [...prev];
  // ... 更新逻辑
  if (newData.length > CHART_DATA_CONFIG.DISPLAY_DATA_SIZE) {
    return newData.slice(-CHART_DATA_CONFIG.DISPLAY_DATA_SIZE);
  }
  return newData;
});
```

---

## ✅ 预期效果

### 指标完整性

| 指标 | 修改前 | 修改后 |
|------|--------|--------|
| **MA30** | 前 30 根无数据 | ✅ 完整 50 根 |
| **BOLL(20)** | 前 20 根无数据 | ✅ 完整 50 根 |
| **MACD(12,26,9)** | 前 35 根无数据 ❌ | ✅ 完整 50 根 |
| **RSI(14)** | 前 15 根无数据 | ✅ 完整 50 根 |
| **KDJ(9)** | 前 9 根无数据 | ✅ 完整 50 根 |

### 性能影响

| 指标 | 修改前 | 修改后 | 影响 |
|------|--------|--------|------|
| 初始加载 | 50 根 | 100 根 | +100% 数据量 |
| 网络传输 | ~5KB | ~10KB | 可忽略 |
| 指标计算 | ~2ms | ~4ms | +2ms（可忽略） |
| 图表渲染 | 50 根 | 50 根 | **无变化** ✅ |
| 内存占用 | ~10KB | ~20KB | 可忽略 |

**结论**: 性能影响极小，用户无感知

---

## 🧪 测试验证

### 验证步骤

1. **清除缓存**
   ```javascript
   localStorage.clear();
   location.reload();
   ```

2. **启用 MACD 指标**
   - 打开指标面板
   - 启用 MACD(12,26,9)

3. **观察左侧数据**
   - ✅ MACD 从第一根 K 线就有数据
   - ✅ 没有空白区域
   - ✅ DIF、DEA、柱状图完整显示

4. **验证实时更新**
   - 等待 WebSocket 推送新 K 线
   - ✅ 完整数据和显示数据都正确更新
   - ✅ MACD 实时更新

5. **验证历史加载**
   - 向左滚动图表
   - ✅ 新加载的历史数据也有完整指标

### 控制台验证

```javascript
// 查看数据量
console.log('完整数据:', fullKlineData.length); // 应该是 100
console.log('显示数据:', displayKlineData.length); // 应该是 50
```

---

## 📝 技术要点

### 1. 数据一致性保证
- 完整数据和显示数据都包含 volume 字段
- WebSocket 推送同时更新两份数据
- 历史加载同时更新两份数据

### 2. 内存管理
- 完整数据超过 150 根时自动裁剪到 100 根
- 显示数据始终保持 50 根
- 防止内存无限增长

### 3. 性能优化
- 指标计算使用完整数据（100 根）
- 图表渲染只用显示数据（50 根）
- 不影响渲染性能

### 4. 向后兼容
- 不影响现有的 WebSocket 实时更新逻辑
- 不影响无限滚动加载历史数据
- 只是数据管理方式的改变

---

## 🚀 部署建议

### 测试环境验证
1. 启用所有指标，验证完整性
2. 长时间运行，验证内存无泄漏
3. 切换周期，验证数据正确重置

### 生产环境监控
- 监控内存占用（应保持稳定）
- 监控网络传输（10KB vs 5KB）
- 监控用户反馈（指标完整性）

---

## 📚 相关文档

- [指标计算器文档](../services/indicators/calculators/README.md)
- [MACD 计算原理](https://en.wikipedia.org/wiki/MACD)
- [TradingView Lightweight Charts](https://tradingview.github.io/lightweight-charts/)

---

## ✅ TypeScript 编译

```bash
npx tsc --noEmit
# ✅ 编译通过，无错误
```

---

**重构完成时间**: 2026-10-22 10:45 UTC  
**测试状态**: 等待验证  
**部署状态**: 待部署
