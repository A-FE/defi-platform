/**
 * Bitquery GraphQL 客户端
 * 文档：https://docs.bitquery.io/
 */

export interface BitqueryConfig {
  endpoint: string;
  apiKey: string;
}

export class BitqueryClient {
  private config: BitqueryConfig;

  constructor() {
    this.config = {
      endpoint: 'https://streaming.bitquery.io/graphql',
      apiKey: process.env.NEXT_PUBLIC_BITQUERY_API_KEY || process.env.BITQUERY_API_KEY || '',
    };

    if (!this.config.apiKey) {
      console.warn('[BitqueryClient] API Key not configured. Set NEXT_PUBLIC_BITQUERY_API_KEY in .env');
    } else {
      console.info('[BitqueryClient] Initialized with API key:', `${this.config.apiKey.substring(0, 20)  }...`);
    }
  }

  /**
   * 执行 GraphQL 查询
   */
  async query<T = unknown>(query: string, variables?: Record<string, unknown>): Promise<T> {
    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          query,
          variables,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      // 检查 GraphQL 错误
      if (result.errors && result.errors.length > 0) {
        const errorMsg = result.errors.map((e: { message: string }) => e.message).join(', ');
        throw new Error(`GraphQL Error: ${errorMsg}`);
      }

      return result.data;
    } catch (error) {
      console.error('[BitqueryClient] Query failed:', error);
      throw error;
    }
  }

  /**
   * 测试连接
   */
  async testConnection(): Promise<boolean> {
    try {
      const testQuery = `
        query {
          ethereum {
            blocks(limit: 1) {
              count
            }
          }
        }
      `;
      await this.query(testQuery);
      console.info('[BitqueryClient] Connection test successful');
      return true;
    } catch (error) {
      console.error('[BitqueryClient] Connection test failed:', error);
      return false;
    }
  }
}

// 导出单例
export const bitqueryClient = new BitqueryClient();
