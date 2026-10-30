# 项目截图说明

此目录用于存放项目的截图和演示图片。

## 📸 需要的截图

为了让 README.md 更加直观，请添加以下截图：

### 1. 首页 (home.png)
- 尺寸建议：1920x1080
- 展示项目首页的整体布局

### 2. 行情页面 (market.png)
- 尺寸建议：1920x1080
- 展示完整的行情界面，包括：
  - 左侧：币种列表
  - 中间：K 线图
  - 右侧：订单簿

### 3. K 线图特写 (chart.png)
- 尺寸建议：1200x800
- 展示 K 线图的细节功能：
  - 多周期切换
  - 技术指标
  - 十字光标

### 4. 代币兑换页面 (swap.png)
- 尺寸建议：1920x1080
- 展示兑换功能界面

### 5. 钱包连接 (wallet.png)
- 尺寸建议：800x600
- 展示钱包连接对话框

### 6. 移动端截图 (mobile.png)
- 尺寸建议：375x812 (iPhone)
- 展示移动端适配效果

## 🎥 动图 (可选)

如果可以，添加 GIF 动图展示交互效果：

- **chart-interaction.gif** - K 线图交互
- **swap-flow.gif** - 兑换流程
- **wallet-connect.gif** - 钱包连接流程

## 📝 如何添加截图

### 方法 1：直接截图
1. 访问 https://defi-platform-udr2.vercel.app/
2. 使用浏览器截图工具或系统截图工具
3. 将截图保存到此目录

### 方法 2：使用截图工具
推荐工具：
- [Carbon](https://carbon.now.sh/) - 代码截图
- [Screely](https://www.screely.com/) - 添加浏览器框
- [CloudApp](https://www.getcloudapp.com/) - 录制 GIF

### 方法 3：命令行截图 (需要 Puppeteer)

```bash
# 安装依赖
npm install puppeteer

# 运行截图脚本
node scripts/take-screenshots.js
```

## 🖼️ 图片优化

上传前请优化图片大小：

```bash
# 使用 ImageOptim (macOS)
# 或使用在线工具
# - TinyPNG: https://tinypng.com/
# - Squoosh: https://squoosh.app/
```

目标：
- PNG: < 500KB
- JPG: < 200KB
- GIF: < 2MB

## 📋 当前状态

- [ ] home.png
- [ ] market.png
- [ ] chart.png
- [ ] swap.png
- [ ] wallet.png
- [ ] mobile.png
- [ ] chart-interaction.gif (可选)
- [ ] swap-flow.gif (可选)
- [ ] wallet-connect.gif (可选)
