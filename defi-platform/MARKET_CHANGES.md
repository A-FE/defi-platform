# 行情功能改进说明

## 📋 主要改动

### 1. 术语变更：从"交易"到"行情"

#### 修改的文件：
- ✅ `app/trading/` → `app/market/` - 页面路由重命名
- ✅ `app/page.tsx` - 首页文案和链接更新
- ✅ `app/market/page.tsx` - 页面标题和说明更新
- ✅ `constants/api.ts` - TRADING_PAIRS → MARKET_SYMBOLS
- ✅ `types/market.ts` - 类型注释更新
- ✅ `README.md` - 项目标题和说明更新

#### 路由变更：
- **旧路由**: `/trading` 
- **新路由**: `/market` (行情页面)
- **Swap路由**: `/market/swap` (保持不变)

### 2. 新增多品种行情支持

#### 新增的品种：
原来只支持默认的 BTCUSDT，现在支持 6 个品种：

```typescript
export const MARKET_SYMBOLS = [
  { symbol: 'BTCUSDT', name: 'BTC/USDT', baseAsset: 'BTC', quoteAsset: 'USDT' },
  { symbol: 'ETHUSDT', name: 'ETH/USDT', baseAsset: 'ETH', quoteAsset: 'USDT' },
  { symbol: 'SOLUSDT', name: 'SOL/USDT', baseAsset: 'SOL', quoteAsset: 'USDT' },
  { symbol: 'BNBUSDT', name: 'BNB/USDT', baseAsset: 'BNB', quoteAsset: 'USDT' },
  { symbol: 'ADAUSDT', name: 'ADA/USDT', baseAsset: 'ADA', quoteAsset: 'USDT' },
  { symbol: 'DOGEUSDT', name: 'DOGE/USDT', baseAsset: 'DOGE', quoteAsset: 'USDT' },
];
```

#### UI 改进：

1. **品种选择器**（位于页面顶部）
   - 横向排列的品种按钮
   - 当前选中品种高亮显示（紫色背景）
   - 点击切换品种，自动更新 K线图和订单簿

2. **组件 Key 绑定**
   ```tsx
   <KlineChart key={selectedSymbol} symbol={selectedSymbol} />
   <OrderBook key={selectedSymbol} symbol={selectedSymbol} />
   ```
   使用 `key` 属性确保切换品种时组件完全重新挂载，避免数据混乱

3. **状态管理**
   ```tsx
   const [selectedSymbol, setSelectedSymbol] = useState(DEFAULT_SYMBOL);
   ```
   使用本地状态管理当前选中的品种

### 3. 类型系统增强

新增 `MarketSymbol` 类型：

```typescript
export interface MarketSymbol {
  symbol: string;       // 交易对符号，如 'BTCUSDT'
  name: string;         // 显示名称，如 'BTC/USDT'
  baseAsset: string;    // 基础资产，如 'BTC'
  quoteAsset: string;   // 计价资产，如 'USDT'
}
```

## 🎨 用户体验改进

### 行情页面 (`/market`)

**顶部品种选择器**：
```
选择品种: [BTC/USDT] [ETH/USDT] [SOL/USDT] [BNB/USDT] [ADA/USDT] [DOGE/USDT]
```

**当前品种信息**：
```
BTCUSDT  [现货]
价格: $50,200  +2.5%
```

**数据展示区域**：
- 左侧：K线图（自动切换到新品种的历史数据）
- 右侧：订单簿（显示新品种的买卖盘）

### 切换品种时的行为

1. 点击品种按钮
2. 按钮背景变为紫色（已选中状态）
3. K线图和订单簿立即切换到新品种
4. Ticker 显示新品种的实时价格
5. WebSocket 自动订阅新品种的数据流

## 🔧 技术实现要点

### 1. 组件重新挂载
使用 `key` 属性强制组件重新挂载：
```tsx
<KlineChart key={selectedSymbol} symbol={selectedSymbol} />
```

**好处**：
- 清空旧品种的状态
- 重新初始化图表
- 重新订阅 WebSocket
- 避免数据混乱

### 2. WebSocket 订阅管理
每次切换品种时：
```typescript
// 1. 取消旧品种订阅
unsubscribeBars(oldSymbol, interval);

// 2. 订阅新品种
subscribeBars(newSymbol, interval, callback);
```

### 3. 缓存策略
K线数据按品种分别缓存：
```typescript
cache: {
  'BTCUSDT_1h': { bars: [...], timestamp: ... },
  'ETHUSDT_1h': { bars: [...], timestamp: ... },
}
```

## 📱 响应式设计

- **桌面端**: 品种选择器横向排列
- **移动端**: 品种选择器自动换行
- 使用 `flex-wrap` 确保小屏幕显示正常

## 🚀 后续可扩展功能

### 1. 品种搜索
```tsx
<input 
  type="text" 
  placeholder="搜索品种..." 
  onChange={handleSearch}
/>
```

### 2. 品种分类
```tsx
const categories = {
  '热门': ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'],
  'DeFi': ['UNIUSDT', 'AAVEUSDT', 'LINKUSDT'],
  'Layer2': ['OPUSDT', 'ARBUSDT', 'MATICUSDT'],
};
```

### 3. 收藏品种
```tsx
const [favorites, setFavorites] = useState<string[]>([]);
```

### 4. 品种对比
在同一界面显示多个品种的图表对比

## 📝 注意事项

1. **Mock 数据服务**需要支持多个品种
2. **WebSocket 订阅**要正确管理多个品种的连接
3. **组件卸载**时记得清理订阅和定时器
4. **性能优化**：避免同时订阅过多品种

## 🎯 测试清单

- [ ] 切换品种时 K线图正确更新
- [ ] 切换品种时订单簿正确更新
- [ ] Ticker 显示正确的品种价格
- [ ] 快速连续切换品种不会出错
- [ ] 刷新页面后保持默认品种
- [ ] WebSocket 连接正常切换
- [ ] 缓存策略正常工作

## 📊 性能指标

- 品种切换延迟：< 100ms
- K线图渲染：< 200ms
- 订单簿更新：< 50ms
- 内存占用：每个品种 < 5MB

---

**更新时间**: 2026-10-20  
**版本**: v1.1.0  
**改动类型**: Feature + Refactor
