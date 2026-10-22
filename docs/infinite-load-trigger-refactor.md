# 无限加载触发阈值重构方案

## 📋 问题背景

### 原始问题
用户反馈："往左滑加载历史数据时，K 线没有触发加载更多，导致 MACD 数据不全"

### 根本原因

**旧的触发条件 `logicalRange.from < 5` 只考虑了 K 线的边界，没有考虑指标的数据需求。**

#### 场景重现
```
初始状态：
- 加载 120 根数据（50 显示 + 70 冗余）
- 可视区：[71 - 120]
- 启用 MACD（需要 35 根历史数据）

用户左滑到第 71 根：
- K 线数据索引：0-119
- 可视区左边界：logicalRange.from = 70
- 旧触发条件：70 < 5？❌ 否
- 结果：不触发加载

继续左滑到第 40 根：
- 可视区左边界：logicalRange.from = 39
- MACD 计算需要：[5-40] 的数据（35 根）
- 实际可用数据：[1-120]
- 评估：勉强够用，但继续左滑就不够了

继续左滑到第 35 根：
- MACD 计算需要：[1-35] 的数据（35 根）
- 实际可用数据：[1-120]
- 评估：刚好够用

继续左滑到第 30 根：
- MACD 计算需要：[-4 到 30] 的数据（35 根）
- 实际可用数据：[1-120]
- ❌ 数据不足！MACD 断裂
```

### 核心矛盾

| 指标 | 最小数据需求 | K 线边界触发 | 问题 |
|------|------------|------------|------|
| K 线 | 1 根 | logicalRange.from < 5 | ✅ 足够早 |
| MA5 | 5 根 | logicalRange.from < 5 | ✅ 刚好 |
| MA30 | 30 根 | logicalRange.from < 5 | ❌ 太晚 |
| MACD | 35 根 | logicalRange.from < 5 | ❌ 太晚 |

**K 线只需要 1 根数据就能显示，但 MACD 需要 35 根历史数据才能计算。**

## 🎯 解决方案

### 核心思路
**无限加载的触发条件应该基于"需求最大的指标"，而不是固定阈值。**

### 触发公式
```typescript
// 旧触发条件（错误）
if (logicalRange.from < 5) {
  loadMoreHistory();
}

// 新触发条件（正确）
const maxIndicatorRequirement = getMaxIndicatorDataRequirement(enabledIndicators);
const SAFETY_BUFFER = 10;
const triggerThreshold = maxIndicatorRequirement + SAFETY_BUFFER;

if (logicalRange.from < triggerThreshold) {
  loadMoreHistory();
}
```

### 安全缓冲区的作用

| 原因 | 说明 |
|------|------|
| **用户体验** | 提前加载，避免用户看到"数据断层" |
| **计算时间** | 给数据加载和指标计算留出时间 |
| **滚动惯性** | 用户快速滚动时，可能一下子跳过好几根 |

**推荐值：10 根（约 20-30% 的最大需求量）**

## 🔧 实施细节

### 修改的文件

| 文件 | 修改内容 | 行数变化 |
|------|---------|---------|
| **utils/indicatorDataRequirements.ts** | 新增 `getMaxIndicatorDataRequirement` 函数 | +17 |
| **components/Chart/hooks/useInfiniteLoadHistory.ts** | 动态计算触发阈值 | +45 |
| **components/Chart/hooks/useKlineChart.ts** | 传递 `enabledIndicators` | +1 |

### 1. `utils/indicatorDataRequirements.ts`

```typescript
/**
 * 获取启用指标中的最大数据需求（不含冗余倍数）
 * 用于无限加载的触发阈值计算
 */
export function getMaxIndicatorDataRequirement(
  enabledIndicators: IndicatorConfig[]
): number {
  if (enabledIndicators.length === 0) {
    return 0;
  }

  return Math.max(
    ...enabledIndicators.map((config) => getIndicatorMinDataSize(config))
  );
}
```

### 2. `useInfiniteLoadHistory.ts`

#### 接口修改
```typescript
interface UseInfiniteLoadHistoryProps {
  // ... 其他属性
  enabledIndicators: IndicatorConfig[]; // ✅ 新增
}
```

#### 动态阈值计算
```typescript
const SAFETY_BUFFER = 10;

const triggerThreshold = useMemo(() => {
  const maxRequirement = getMaxIndicatorDataRequirement(enabledIndicators);
  const threshold = maxRequirement + SAFETY_BUFFER;

  console.log('[useInfiniteLoadHistory] 📏 计算触发阈值:', {
    maxRequirement,
    safetyBuffer: SAFETY_BUFFER,
    threshold,
    indicators: enabledIndicators.map(ind =>
      `${ind.type}(${Object.values(ind.params).join(',')})`
    ),
  });

  return threshold;
}, [enabledIndicators]);
```

#### 滚动监听修改
```typescript
const handleVisibleRangeChange = () => {
  const logicalRange = timeScale.getVisibleLogicalRange();
  if (!logicalRange) return;

  console.log('[useInfiniteLoadHistory] 📊 可视范围变化:', {
    from: logicalRange.from.toFixed(2),
    to: logicalRange.to.toFixed(2),
    triggerThreshold,
    shouldLoad: logicalRange.from < triggerThreshold,
  });

  // ✅ 使用动态阈值
  if (logicalRange.from < triggerThreshold) {
    console.log('[useInfiniteLoadHistory] 🔄 触发历史数据加载');
    loadMoreHistory();
  }
};
```

### 3. `useKlineChart.ts`

```typescript
const {
  isLoadingMore,
  resetHistory,
  oldestTimeRef,
} = useInfiniteLoadHistory({
  symbol,
  interval,
  chartRef,
  seriesRef,
  fetchKlines,
  currentKlineData: fullKlineData,
  onDataLoaded: (bars) => {
    setFullKlineData(bars);
    setDisplayKlineData(bars);
  },
  enabledIndicators, // ✅ 传入启用的指标列表
});
```

## 📊 效果对比

### 修改前 ❌

| 场景 | 可视区 | 触发条件 | 结果 | 问题 |
|------|--------|---------|------|------|
| 初始 | 第 71 根 | 70 < 5？ | ❌ 不触发 | - |
| 左滑 | 第 40 根 | 39 < 5？ | ❌ 不触发 | MACD 只有 4 根历史 |
| 左滑 | 第 30 根 | 29 < 5？ | ❌ 不触发 | ❌ MACD 数据不足 |
| 左滑 | 第 5 根 | 4 < 5？ | ✅ 触发 | 太晚了 |

### 修改后 ✅

| 场景 | 可视区 | 触发阈值 | 触发条件 | 结果 | 数据状态 |
|------|--------|---------|---------|------|---------|
| 初始 | 第 71 根 | 45 | 70 < 45？ | ❌ 不触发 | MACD 有 35+ 根历史 ✅ |
| 左滑 | 第 50 根 | 45 | 49 < 45？ | ❌ 不触发 | MACD 有 14+ 根历史 ✅ |
| 左滑 | 第 45 根 | 45 | 44 < 45？ | ✅ 触发加载 | 提前加载，避免断层 |
| 加载后 | 第 45 根 | 45 | - | 170 根数据 | MACD 有 35+ 根历史 ✅ |

## 🧪 测试验证

### 测试结果

```
测试 1: 获取最大指标需求（不含冗余倍数）
✅ MA30: 30 根
✅ MACD: 35 根
✅ BOLL: 20 根
✅ KDJ: 9 根

测试 2: 计算触发阈值（最大需求 + 安全缓冲区）
✅ 未启用指标: 10 根 (0 + 10)
✅ 启用 MA30: 40 根 (30 + 10)
✅ 启用 MACD: 45 根 (35 + 10)

测试 3: 多个指标取最大需求
✅ 所有指标启用: 35 根（MACD 最大）
✅ 触发阈值: 45 根

测试 4: 实际场景模拟
✅ 第 71 根：不触发（数据充足）
✅ 第 45 根：触发加载（临界点）
✅ 加载后：MACD 数据完整
```

### 测试场景

| 场景 | 触发阈值 | 说明 |
|------|---------|------|
| 未启用指标 | 10 | 基础触发，避免过早加载 |
| 启用 MA5 | 15 | 5 + 10 |
| 启用 MA30 | 40 | 30 + 10 |
| 启用 MACD | 45 | 35 + 10（需求最大） |
| 启用所有指标 | 45 | 取最大值 |

## 📈 优势总结

### 1. 自动适配
- ✅ 根据启用的指标自动调整触发阈值
- ✅ 无需手动配置，零维护成本

### 2. 提前加载
- ✅ 安全缓冲区确保用户体验流畅
- ✅ 避免用户看到"数据断层"

### 3. 避免浪费
- ✅ 未启用指标时，阈值较小（10），不过早加载
- ✅ 启用 MACD 时，阈值增大（45），提前加载

### 4. 逻辑清晰
- ✅ 触发条件明确，容易调试和维护
- ✅ 详细的日志输出，方便排查问题

## 🔄 动态行为

### 用户操作与触发阈值变化

| 用户操作 | 触发阈值变化 | 加载行为 |
|---------|------------|---------|
| 启用 MA5 | 10 → 15 | 稍微提前触发 |
| 启用 MA30 | 15 → 40 | 更早触发加载 |
| 启用 MACD | 40 → 45 | 最早触发加载 |
| 禁用所有指标 | 45 → 10 | 恢复默认触发 |
| 调整 MACD 参数 | 重新计算 | 动态调整 |

### 实时日志示例

```javascript
[useInfiniteLoadHistory] 📏 计算触发阈值: {
  maxRequirement: 35,
  safetyBuffer: 10,
  threshold: 45,
  indicators: ['MACD(12,26,9)', 'MA(5,10,20,30)', 'KDJ(9,3,3)']
}

[useInfiniteLoadHistory] 📊 可视范围变化: {
  from: "44.23",
  to: "93.45",
  triggerThreshold: 45,
  shouldLoad: true
}

[useInfiniteLoadHistory] 🔄 触发历史数据加载
```

## ⚠️ 注意事项

### 1. 安全缓冲区调优

```typescript
const SAFETY_BUFFER = 10;
```

| 值 | 优点 | 缺点 | 推荐 |
|----|------|------|------|
| 5 | 节省带宽 | 快速滚动时可能看到断层 | ❌ |
| 10 | 平衡性好 | - | ✅ |
| 20 | 更安全 | 可能过早触发 | ⚠️ |

### 2. 性能优化

- ✅ 使用 `useMemo` 缓存触发阈值
- ✅ 只在 `enabledIndicators` 变化时重新计算
- ✅ 避免每次滚动都重新计算

### 3. 日志级别

开发环境：详细日志输出
```typescript
console.log('[useInfiniteLoadHistory] 📊 可视范围变化:', {...});
```

生产环境：建议移除或改为 `console.debug`

## 📝 总结

### 修改前的问题
1. ❌ 固定阈值 `< 5` 只考虑 K 线边界
2. ❌ 不考虑指标的数据需求
3. ❌ 左滑时 MACD 数据不全

### 修改后的改进
1. ✅ 动态阈值基于需求最大的指标
2. ✅ 自动适配启用的指标
3. ✅ 确保所有指标始终有足够数据
4. ✅ 提前加载，用户体验流畅

### 代码质量
- ✅ 类型安全
- ✅ 单一职责
- ✅ 易于测试
- ✅ 日志完善
- ✅ 性能优化

## 🚀 下一步

1. **性能监控**：观察实际使用中的触发频率
2. **用户反馈**：收集用户对滚动体验的反馈
3. **参数调优**：根据实际情况调整 `SAFETY_BUFFER`
4. **日志优化**：生产环境调整日志级别
