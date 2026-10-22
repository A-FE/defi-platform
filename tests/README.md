# 测试文件说明

本目录包含项目的测试和验证脚本。

## 测试文件

### indicatorDataRequirements.test.ts
测试指标数据需求计算逻辑：
- 计算各个指标的最小数据需求
- 验证冗余数据量计算（2倍安全系数）
- 验证总加载量计算

运行：`npx tsx tests/indicatorDataRequirements.test.ts`

### infiniteLoadTrigger.test.ts
测试无限加载触发阈值逻辑：
- 验证动态触发阈值计算
- 模拟实际滚动场景
- 对比修改前后的行为差异

运行：`npx tsx tests/infiniteLoadTrigger.test.ts`

## 运行所有测试

```bash
npx tsx tests/indicatorDataRequirements.test.ts
npx tsx tests/infiniteLoadTrigger.test.ts
```
