# K线 Mock 系统重设计方案

## 问题诊断

### 当前问题
1. **单例状态污染**：`klineMockService` 单例导致状态在不同周期间共享
2. **时间计算不一致**：多处独立计算时间戳，容易产生 `currentBarTime < lastBarTime` 的情况
3. **切换周期时状态残留**：旧订阅的状态影响新订阅
4. **数据连续性断裂**：历史数据最后一根和实时数据第一根之间不连续

### 错误示例
```
用户操作：1h → 5m → 1h
结果：第二次 1h 使用了 5m 的 lastBar 状态，时间戳错位
警告：[subscribeBars] Current bar time is older than last bar, skipping
```

## 新架构设计

### 核心原则
1. **会话隔离**：每个 symbol+interval 独立管理状态
2. **无状态服务**：核心工具类不保存状态
3. **统一时间源**：集中管理时间对齐逻辑
4. **严格连续性**：保证历史和实时数据无缝衔接

### 架构图
```
useKlineStore (Store层)
    ↓
KlineSessionManager (会话管理)
    ↓
KlineSession[] (独立会话)
    ├── state: { lastBar, trend, basePrice }
    ├── generateHistory()
    └── generateRealtimeUpdate()
    
工具层：
    ├── TimeAlignmentUtil (时间对齐)
    └── PriceGenerator (价格生成)
```

## 实现步骤

### Step 1: 创建时间对齐工具
**文件**: `services/mock/kline/TimeAlignmentUtil.ts`

功能：
- `alignToInterval(timestamp, interval)`: 对齐到周期起点
- `getIntervalMs(interval)`: 获取周期毫秒数
- `validateBarTime(newTime, lastTime)`: 验证时间戳有效性

### Step 2: 创建价格生成器
**文件**: `services/mock/kline/PriceGenerator.ts`

功能：
- 纯函数，不保存状态
- `calculatePrice(prevBar, trend, trendStrength)`: 计算价格
- `calculateVolume(priceChange)`: 计算成交量
- 模拟真实市场特征（趋势、波动、成交量相关性）

### Step 3: 创建 K线会话类
**文件**: `services/mock/kline/KlineSession.ts`

状态：
```typescript
{
  symbol: string
  interval: KlineInterval
  lastBar: KlineBar | null
  trend: number
  trendStrength: number
  basePrice: number
}
```

方法：
- `generateHistory(limit, before?)`: 生成历史数据
- `generateRealtimeUpdate(now)`: 生成实时更新
- `reset()`: 重置状态

关键逻辑：
- 历史数据生成时，endTime 严格对齐
- 实时更新时，每次重新计算 currentBarTime
- 维护 lastBar 状态确保连续性

### Step 4: 创建会话管理器
**文件**: `services/mock/kline/KlineSessionManager.ts`

功能：
- 管理所有活跃的 session
- `getOrCreateSession(symbol, interval)`: 获取或创建会话
- `destroySession(sessionId)`: 销毁会话
- `reset()`: 重置所有会话

结构：
```typescript
sessions: Map<string, KlineSession>
// key: `${symbol}_${interval}`
```

### Step 5: 更新 Store 层
**文件**: `stores/kline/useKlineStore.ts`

改动：
1. 使用 `KlineSessionManager` 替代 `klineMockService`
2. `fetchHistory`: 调用 `sessionManager.getOrCreateSession().generateHistory()`
3. `subscribeBars`: 
   - 获取 session
   - 使用 session 生成实时数据
   - 返回 unsubscribe 函数（包含 session 清理）
4. 添加 `unsubscribeBars` 实现：销毁对应的 session

### Step 6: 删除旧文件
- 删除 `services/mock/klineMock.ts`
- 更新 `services/mock/index.ts` 导出

## 数据流示例

### 初次加载
```
1. useKlineData.loadKlineData('BTCUSDT', '1h')
2. useKlineStore.fetchHistory('BTCUSDT', '1h', 100)
3. sessionManager.getOrCreateSession('BTCUSDT', '1h')
   → 创建新 session，状态初始化
4. session.generateHistory(100)
   → endTime = alignToInterval(now, '1h')  // 例如 14:00:00
   → 生成 100 根 bar，最后一根时间为 14:00:00
5. useKlineStore.subscribeBars('BTCUSDT', '1h', lastBar, callback)
   → setInterval 每 2 秒执行：
     - currentBarTime = alignToInterval(now, '1h')  // 14:00:00
     - 如果 currentBarTime === lastBarTime → 更新当前 bar
     - 如果 currentBarTime > lastBarTime → 生成新 bar (15:00:00)
```

### 切换周期
```
1. useKlineData.setInterval('5m')
2. 调用旧订阅的 unsubscribe()
   → sessionManager.destroySession('BTCUSDT_1h')
   → 清除 1h 会话状态
3. useKlineStore.fetchHistory('BTCUSDT', '5m', 100)
   → sessionManager.getOrCreateSession('BTCUSDT', '5m')
   → 创建全新的 5m 会话（独立状态）
4. session.generateHistory(100)
   → endTime = alignToInterval(now, '5m')  // 例如 14:30:00
5. 订阅 5m 实时更新
   → 使用 5m session 的状态，不受 1h 影响
```

## 关键改进点

### 1. 时间戳一致性保证
```typescript
// 旧代码（有问题）
const currentBarTime = align(Date.now(), interval)
const bar = generateBar(interval)  // 内部又计算一次，可能不一致

// 新代码（正确）
const currentBarTime = align(Date.now(), interval)
const bar = session.generateRealtimeUpdate(currentBarTime)  // 直接使用
```

### 2. 状态隔离
```typescript
// 旧代码（有问题）
单例 klineMockService.lastBar  // 所有周期共享

// 新代码（正确）
session_1h.lastBar  // 1h 专用
session_5m.lastBar  // 5m 专用
```

### 3. 生命周期管理
```typescript
// 新代码
切换周期 → destroySession(旧) → createSession(新)
// 确保状态完全重置，不残留
```

## 测试要点

1. **时间戳单调性**：所有生成的 bar.time 必须 >= lastBar.time
2. **周期切换**：1h → 5m → 1h，最后的 1h 数据正确
3. **数据连续性**：bar[i].close === bar[i+1].open
4. **并发订阅**：多个 symbol 同时订阅不相互影响
5. **重复切换**：频繁切换周期不报错

## 回滚方案

如果新架构出现问题，可以快速回滚：
1. 恢复 `services/mock/klineMock.ts`
2. 恢复 `stores/kline/useKlineStore.ts` 的旧版本
3. Git revert 相关提交

## 时间估算

- Step 1-2: 30分钟（工具类）
- Step 3: 45分钟（Session 类）
- Step 4: 30分钟（SessionManager）
- Step 5: 30分钟（Store 更新）
- Step 6: 15分钟（清理旧代码）
- 测试验证: 30分钟

**总计：约 3 小时**
