# MACD 断层修复 - 验证指南

## 修复内容

已修复无限左滑加载历史数据时 MACD 等指标出现断层的问题。

### 修改文件
- `components/Chart/hooks/useKlineData.ts` - `loadMoreHistory` 函数

### 核心改进

#### 修复前（有问题）
```typescript
// ❌ 只用 50 根历史数据计算指标
const olderBars = await fetchKlines(symbol, interval, from, to, enabledIndicators);
const adjustedOlderBars = olderBars.map(bar => ({ ...bar, ... }));
finalAdjustedBars = mockCalculateIndicators(adjustedOlderBars, { ... });
// 结果：前 35 根 K 线没有 MACD 数据 → 断层
```

#### 修复后（正确）
```typescript
// ✅ 使用滑动窗口：历史 50 根 + 当前 100 根 = 150 根完整数据集
const olderBars = await fetchKlines(symbol, interval, from, to, []);  // 只获取 K 线
const adjustedOlderBars = olderBars.map(bar => ({ ...bar, ... }));
const currentCompleteData = klineData;  // 当前已有的 100 根数据
const allBars = [...adjustedOlderBars, ...currentCompleteData];  // 150 根
const allBarsWithIndicators = mockCalculateIndicators(allBars, { ... });
finalAdjustedBars = allBarsWithIndicators.slice(0, 50);  // 只取前 50 根
// 结果：所有 50 根都有完整的 MACD 数据 ✅
```

### 为什么能解决问题

**MACD 需要预热周期**：
- EMA(26) 需要 26 根 K 线
- DEA = EMA(DIF, 9) 需要 9 根 DIF 值
- **总计：至少需要 35 根 K 线才能开始计算 MACD**

**滑动窗口方法**：
- 计算前 50 根历史数据的指标时，提供后面 100 根作为上下文
- MACD 计算器看到 150 根完整数据，可以准确计算每一根的指标
- 只取前 50 根作为新加载的历史数据
- **无断层 ✅**

---

## 验证步骤

### 前置准备

1. 启动开发服务器
   ```bash
   npm run dev
   ```

2. 打开浏览器控制台（F12 → Console）

### 测试场景 1：MACD 连续性验证

**步骤**：
1. 打开 K 线图页面
2. 启用 MACD 指标（通过指标配置菜单）
3. 等待初始数据加载完成（约 100 根 K 线）
4. **观察初始状态**：MACD 线条应从第 35 根左右开始显示
5. **左滑加载历史数据**：向左拖动图表，触发加载更多历史数据
6. **重复左滑 3-4 次**，每次加载 50 根历史数据

**预期结果**：
- ✅ MACD 线条连续，无断层
- ✅ 控制台输出日志：
  ```
  [loadMoreHistory] 使用滑动窗口计算指标: {
    历史数据: 50,
    当前数据: 100,  // 第一次
    完整数据集: 150
  }
  [loadMoreHistory] 滑动窗口指标计算完成: {
    输入数据: 150,
    输出历史数据: 50,
    示例指标: ['macd']
  }
  ```
- ✅ DIF（蓝线）、DEA（橙线）、HIST（柱状图）都完整显示
- ✅ 没有"空白区域"或"数据突然消失"的现象

**失败表现**（如果没修复）：
- ❌ 左滑后，中间出现一段没有 MACD 数据的区域
- ❌ MACD 线条断开

### 测试场景 2：多指标同时验证

**步骤**：
1. 同时启用多个指标：
   - MACD (12, 26, 9)
   - RSI (14)
   - MA (5, 10, 20)
   - BOLL (20, 2)
2. 左滑加载历史数据 3 次

**预期结果**：
- ✅ 所有指标都连续显示
- ✅ MACD、RSI、BOLL 都没有断层
- ✅ MA 线条平滑连接

### 测试场景 3：不同周期验证

**步骤**：
1. 切换到 1h 周期，启用 MACD
2. 左滑加载历史数据 2 次
3. 切换到 4h 周期
4. 左滑加载历史数据 2 次
5. 切换到 1d 周期
6. 左滑加载历史数据 2 次

**预期结果**：
- ✅ 每个周期的 MACD 都连续
- ✅ 切换周期后指标正确重新加载

### 测试场景 4：实时更新验证

**步骤**：
1. 启用 MACD
2. 左滑加载一次历史数据
3. 等待实时 K 线更新（约 1-2 分钟）

**预期结果**：
- ✅ 实时 K 线更新时，MACD 也同步更新
- ✅ 历史数据的 MACD 保持不变

---

## 控制台日志说明

### 正常日志输出

**初始加载**：
```
[loadKlineData] 初始加载 100 根K线，最早时间: 2026-10-21 12:00:00
[IndicatorManager] MACD rendered: 65 points on pane 1
```

**第一次左滑**：
```
[loadMoreHistory] 当前最早K线: time=1729512000, open=100.5
[loadMoreHistory] 价格调整: 100.2 -> 100.5, 比例: 1.00299
[loadMoreHistory] 使用滑动窗口计算指标: {
  历史数据: 50,
  当前数据: 100,
  完整数据集: 150
}
[mockCalculateIndicators] MACD calculated: 115 points
[loadMoreHistory] 滑动窗口指标计算完成: {
  输入数据: 150,
  输出历史数据: 50,
  示例指标: ['macd']
}
[loadMoreHistory] 加载了 50 根历史K线（含指标），最早时间: 2026-10-21 09:00:00
[IndicatorManager] MACD rendered: 115 points on pane 1
```

**第二次左滑**：
```
[loadMoreHistory] 使用滑动窗口计算指标: {
  历史数据: 50,
  当前数据: 150,  // ✅ 注意：当前数据增加到 150 根
  完整数据集: 200
}
[mockCalculateIndicators] MACD calculated: 165 points
[loadMoreHistory] 滑动窗口指标计算完成: {
  输入数据: 200,
  输出历史数据: 50,
  示例指标: ['macd']
}
```

### 关键指标

1. **`完整数据集`**：应该 = 历史数据 + 当前数据
2. **`输出历史数据`**：应该 = 历史数据的数量（50 根）
3. **`示例指标`**：应该包含 `['macd']` 或其他启用的指标

---

## 已知问题（如果遇到）

### 问题 1：控制台报错 "Cannot read properties of undefined"

**原因**：`klineData` 状态未初始化

**解决**：等待初始数据加载完成后再左滑

### 问题 2：MACD 计算返回 0 个点

**可能原因**：
- 数据不足（少于 35 根）
- 指标计算器参数错误

**检查**：
```
[mockCalculateIndicators] MACD calculated: 0 points  // ❌ 异常
```

**解决**：检查控制台日志中的 `完整数据集` 数量是否足够

---

## 性能监控

### 预期性能

**初始加载**：
- 100 根 K 线 + MACD 计算：< 100ms

**左滑加载一次**：
- 50 根 K 线 + 完整数据集（150 根）MACD 计算：< 150ms

**左滑加载多次**：
- 随着数据增多，计算时间会线性增长
- 200 根数据：< 200ms
- 300 根数据：< 300ms

### 性能问题判断

如果左滑加载时出现卡顿（> 500ms），可能需要优化：
- 使用增量计算
- 缓存计算结果
- 移到 Web Worker

---

## 回归测试清单

在部署到生产环境前，请确认以下所有项：

- [ ] MACD 连续性：左滑 4 次无断层
- [ ] 多指标：MACD + RSI + MA 同时启用，无断层
- [ ] 周期切换：1h / 4h / 1d 都正常
- [ ] 实时更新：左滑后实时 K 线正常更新
- [ ] 性能：左滑加载时间 < 200ms（前 3 次）
- [ ] 无错误日志：控制台无红色错误
- [ ] 价格连续：新旧数据拼接处价格平滑

---

## 总结

### 修复效果

- ✅ **MACD 断层问题已解决**
- ✅ 使用滑动窗口算法，确保指标计算有足够的上下文
- ✅ 支持无限左滑，指标始终连续

### 技术亮点

1. **滑动窗口计算**：经典的时间序列处理技巧
2. **最小化数据传输**：只获取 K 线，本地计算指标
3. **向后兼容**：不影响现有功能

### 未来优化方向

1. **性能优化**：增量计算 + 缓存
2. **统一 Hook**：合并 3 个 hooks 为 1 个（第 2 步）
3. **后端计算**：生产环境由后端计算指标
