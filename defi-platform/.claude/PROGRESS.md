# 迁移实施进度报告

## ✅ 第一阶段完成：EVM 基础设施 + 多币种 UI

### 已完成的工作

#### 1. 依赖包迁移 ✅
- ✅ 移除 Solana 相关依赖包
  - `@solana/wallet-adapter-react`
  - `@solana/wallet-adapter-react-ui`
  - `@solana/wallet-adapter-wallets`
  - `@solana/web3.js`

- ✅ 添加 EVM 生态依赖包
  - `viem ^2.21.0` - 轻量级 EVM 库
  - `wagmi ^2.12.0` - React Hooks for Ethereum
  - `@tanstack/react-query ^5.59.0` - 状态管理
  - `@rainbow-me/rainbowkit ^2.1.0` - 钱包 UI（暂未使用，规避了依赖问题）

#### 2. 类型定义重构 ✅
- ✅ 创建 `types/evm.ts`
  - `WalletInfo` - EVM 钱包信息
  - `TokenInfo` - ERC20 代币信息
  - `EVMChain` - 支持的链类型
  - `ChainConfig` - 链配置映射

- ✅ 更新 `types/market.ts`
  - `MarketSymbol` 增加 `icon`、`dex`、`chainId` 字段

#### 3. 常量配置更新 ✅
- ✅ 更新 `constants/tokens.ts`
  - 定义 `EVM_TOKENS`（ETH、WETH、USDT、USDC、WBTC、UNI、LINK）
  - 替换 `TOKENS` 为 `EVM_TOKENS`

- ✅ 创建 `constants/markets.ts`
  - 定义 5 个主流交易对（WETH/USDC、WBTC/USDC、LINK/USDC、UNI/USDC、USDT/USDC）
  - 设置默认市场为 `WETH/USDC`

#### 4. 钱包集成（纯 Wagmi 方案）✅
- ✅ 创建 `config/wagmi.ts` - Wagmi 配置
  - 支持以太坊主网和 Polygon
  - 集成 MetaMask (injected) 和 WalletConnect

- ✅ 创建 `app/providers.tsx` - Web3Provider
  - WagmiProvider + QueryClientProvider
  - 避免使用 RainbowKit（规避 Coinbase 连接器的依赖问题）

- ✅ 更新 `components/Wallet/WalletButton.tsx`
  - 使用 `useAccount`、`useConnect`、`useDisconnect` Hooks
  - 显示连接状态和地址

- ✅ 更新 `app/layout.tsx`
  - 集成 Web3Provider 包裹整个应用

#### 5. 多币种切换 UI ✅
- ✅ 创建 `stores/market/useMarketStore.ts`
  - 管理当前选中的交易对
  - `selectedSymbol` 状态
  - `setSelectedSymbol` 切换方法

- ✅ 创建 `components/MarketPanel/MarketList.tsx`（左侧面板）
  - 220px 固定宽度
  - 搜索框支持过滤
  - 币种列表展示（图标、名称、DEX）
  - 选中状态高亮
  - 底部统计显示交易对数量

- ✅ 重构 `app/market/page.tsx`（左中右布局）
  - **左侧**：币种列表 (220px)
  - **中间**：Ticker + K线图 (flex-1)
  - **右侧**：订单簿 (320px)
  - 响应式设计准备（Desktop 三栏布局）

#### 6. 环境变量配置 ✅
- ✅ 更新 `.env.example` 和 `.env.local`
  - `NEXT_PUBLIC_ETHEREUM_RPC_URL` - 以太坊 RPC（使用 llamarpc）
  - `NEXT_PUBLIC_POLYGON_RPC_URL` - Polygon RPC
  - `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` - WalletConnect 项目 ID
  - `BITQUERY_API_KEY` - Bitquery API 密钥（待配置）

#### 7. 其他修复 ✅
- ✅ 修复 `components/Swap/SwapPanel.tsx` 中的导入错误
  - `TOKENS` → `EVM_TOKENS`

- ✅ 修复 `next.config.ts` 配置
  - 添加 Turbopack 和 Webpack fallback 配置
  - 忽略缺失的 x402 模块

---

## 🚧 第二阶段：Bitquery API 集成（进行中）

### 待完成的任务

#### 1. Bitquery 客户端封装
- [ ] 创建 `services/bitquery/BitqueryClient.ts`
  - GraphQL 客户端封装
  - 请求/响应拦截器
  - 错误处理

#### 2. GraphQL 查询定义
- [ ] 创建 `services/bitquery/queries.ts`
  - `KLINE_QUERY` - K线数据查询
  - `TICKER_QUERY` - Ticker 行情查询
  - `DEPTH_QUERY` - 订单簿查询（降级方案）

#### 3. 数据服务实现
- [ ] `services/bitquery/klineService.ts` - K线数据服务
- [ ] `services/bitquery/tickerService.ts` - Ticker 服务
- [ ] `services/bitquery/depthService.ts` - 订单簿服务

#### 4. 数据适配器
- [ ] `services/adapters/bitqueryAdapter.ts`
  - 将 Bitquery 响应转换为标准格式
  - `adaptKlineData()` - K线数据适配
  - `adaptTickerData()` - Ticker 数据适配
  - `adaptDepthData()` - 订单簿数据适配

#### 5. 更新 Zustand Stores
- [ ] 更新 `stores/kline/useKlineStore.ts` 使用 Bitquery 服务
- [ ] 更新 `stores/ticker/useTickerStore.ts` 使用 Bitquery 服务
- [ ] 更新 `stores/depth/useDepthStore.ts` 使用 Bitquery 服务

#### 6. WebSocket 订阅改造
- [ ] 将 Mock WebSocket 替换为 Bitquery Streaming API
- [ ] 更新 `services/websocket/index.ts`

---

## 📊 当前状态

### 可运行功能
- ✅ 开发服务器正常启动（http://localhost:3000）
- ✅ 页面渲染正常
- ✅ 左中右布局结构已搭建
- ✅ 钱包连接按钮可用（MetaMask/WalletConnect）
- ✅ 币种列表展示和切换

### 暂不可用功能
- ❌ K线图数据（仍使用 Mock，需要接入 Bitquery）
- ❌ Ticker 行情数据（仍使用 Mock）
- ❌ 订单簿数据（仍使用 Mock）
- ❌ 实时 WebSocket 推送（需要改造）

---

## 🎯 下一步行动

### 立即开始
1. 获取 Bitquery API Key（https://bitquery.io/）
2. 实现 BitqueryClient 和基础查询
3. 接入 K线数据服务
4. 测试多币种切换 + 真实数据加载

### 本周目标
- 完成 Bitquery K线数据集成
- 完成 Ticker 行情数据集成
- 订单簿降级方案实现

---

## ⚠️ 已知问题

### 1. TypeScript 类型检查失败
**问题：** 测试文件缺少类型定义
**影响：** 不影响运行时，仅影响构建
**解决方案：** 
- 方案 A：安装 `@types/jest` 或 `@types/mocha`
- 方案 B：暂时在 `tsconfig.json` 中排除测试文件

### 2. RainbowKit 依赖问题
**问题：** Coinbase 连接器依赖缺失的 x402 模块
**解决方案：** 已采用纯 Wagmi 方案，不使用 RainbowKit
**影响：** 钱包连接 UI 需要自定义（已完成）

---

## 📝 配置清单

### 用户需要配置的环境变量
```env
# 必须配置
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=<从 https://cloud.walletconnect.com/ 获取>
BITQUERY_API_KEY=<从 https://bitquery.io/ 获取>

# 可选配置（使用免费 RPC）
NEXT_PUBLIC_ETHEREUM_RPC_URL=https://eth.llamarpc.com
NEXT_PUBLIC_POLYGON_RPC_URL=https://polygon.llamarpc.com
```

---

**报告时间：** 2026-10-24  
**项目状态：** 第一阶段完成 ✅  
**开发服务器：** http://localhost:3000 🟢
