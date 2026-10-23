/**
 * 指标系统 V2 - 演示页面
 *
 * 访问路径: /market (主页面已集成)
 *
 * 使用方式：
 * 1. 设置环境变量 NEXT_PUBLIC_USE_INDICATOR_V2=true
 * 2. 重启开发服务器
 * 3. 访问 /market 页面
 * 4. 打开浏览器控制台查看日志
 */

// 主页面已经集成了 V2，无需单独创建演示页面
// 只需在 .env.local 中设置：
// NEXT_PUBLIC_USE_INDICATOR_V2=true

export default function V2DemoPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">指标系统 V2 演示</h1>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
        <h2 className="font-semibold mb-2">⚠️ 提示</h2>
        <p>主图表页面已集成 V2 架构，请访问:</p>
        <a href="/market" className="text-blue-600 hover:underline">
          /market
        </a>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h2 className="font-semibold mb-2">🔧 启用 V2</h2>
        <ol className="list-decimal list-inside space-y-2">
          <li>在 <code className="bg-gray-100 px-2 py-1 rounded">.env.local</code> 中添加：
            <pre className="bg-gray-800 text-white p-2 rounded mt-1">
              NEXT_PUBLIC_USE_INDICATOR_V2=true
            </pre>
          </li>
          <li>重启开发服务器：<code className="bg-gray-100 px-2 py-1 rounded">npm run dev</code></li>
          <li>打开控制台查看日志：
            <ul className="list-disc list-inside ml-4 mt-1">
              <li>✅ <code>USE_INDICATOR_V2 is ENABLED</code> - V2 启用</li>
              <li>❌ <code>USE_INDICATOR_V2 is DISABLED</code> - 使用旧版</li>
            </ul>
          </li>
        </ol>
      </div>

      <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
        <h2 className="font-semibold mb-2">✅ 测试清单</h2>
        <p>参考测试指南: <code>docs/v2-integration-test-guide.md</code></p>
      </div>
    </div>
  );
}
