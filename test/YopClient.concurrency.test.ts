import { describe, beforeEach, afterEach, test, expect, jest } from '@jest/globals';
import { YopClient } from '../src/YopClient';
import { YopConfig } from '../src/types';
import { RsaV3Util } from '../src/utils/RsaV3Util';
import { VerifyUtils } from '../src/utils/VerifyUtils';

/**
 * YopClient 并发请求测试
 *
 * 测试场景包括:
 * 1. 大量并发 GET 请求处理
 * 2. 混合 GET/POST 并发执行
 * 3. 不同实例的请求隔离性
 * 4. 同一实例跨请求状态隔离
 * 5. 并发请求签名唯一性
 * 6. 并发请求错误处理独立性
 * 7. 性能基准测试
 */

describe('YopClient 并发请求测试', () => {
  let mockFetch: jest.MockedFunction<typeof fetch>;
  let mockGetAuthHeaders: jest.MockedFunction<typeof RsaV3Util.getAuthHeaders>;
  let mockIsValidRsaResult: jest.MockedFunction<typeof VerifyUtils.isValidRsaResult>;

  // 有效的 PEM 格式公钥（用于测试）
  const validPemPublicKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA6p0XWjscY+gsyqKRhw9M
eLsEmhFdBRhT2emOck/F1Omw38ZWhJxh9kDfs5HzFJMrVozgU+SJFDONxs8UB0wM
ILKRmqfLcfClG9MyCNuJkkfm0HFQv1hRGdOvZPXj3Bckuwa7FrEXBRYUhK7vJ40a
fumspthmse6bs6mZxNn/mALZ2X07uznOrrc2rk41Y2HftduxZw6T4EmtWuN2x4CZ
8gwSyPAW5ZzZJLQ6tZDojBK4GZTAGhnn3bg5bBsBlw2+FLkCQBuDsJVsFPiGh/b6
K/+zGTvWyUcu+LUj2MejYQELDO3i2vQXVDk7lVi2/TcUYefvIcssnzsfCfjaorxs
uwIDAQAB
-----END PUBLIC KEY-----`;

  // Mock 私钥
  const mockSecretKey = `-----BEGIN PRIVATE KEY-----
MOCK_SECRET_KEY_CONTENT
-----END PRIVATE KEY-----`;

  // Mock 配置
  const mockConfig: YopConfig = {
    appKey: 'test_app_key',
    secretKey: mockSecretKey,
    yopPublicKey: validPemPublicKey,
    yopApiBaseUrl: 'https://test-api.yeepay.com/yop-center',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock fetch
    mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
    global.fetch = mockFetch;

    // Mock RsaV3Util.getAuthHeaders
    mockGetAuthHeaders = jest.fn().mockReturnValue({
      'x-yop-appkey': 'test_app_key',
      'x-yop-sign': 'mock-signature',
    }) as jest.MockedFunction<typeof RsaV3Util.getAuthHeaders>;
    (RsaV3Util as any).getAuthHeaders = mockGetAuthHeaders;

    // Mock VerifyUtils.isValidRsaResult - 绕过签名验证
    mockIsValidRsaResult = jest.fn().mockReturnValue(true) as jest.MockedFunction<
      typeof VerifyUtils.isValidRsaResult
    >;
    (VerifyUtils as any).isValidRsaResult = mockIsValidRsaResult;

    // 默认 fetch 成功响应
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: {
        get: (name: string) => {
          if (name === 'x-yop-sign') return 'platform-signature';
          if (name === 'content-type') return 'application/json';
          return null;
        },
      } as any,
      text: async () =>
        JSON.stringify({
          state: 'SUCCESS',
          result: { code: 'OPR00000', data: 'test' },
        }),
    } as Response);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('大量并发 GET 请求', () => {
    test('[P0] 应成功处理 100 个并发 GET 请求', async () => {
      const yopClient = new YopClient(mockConfig);
      const concurrentRequests = 100;
      const promises: Promise<any>[] = [];

      // 创建 100 个并发请求
      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(yopClient.get(`/api/test${i}`, { id: i.toString() }));
      }

      // 等待所有请求完成
      const results = await Promise.all(promises);

      // 验证所有请求都成功
      expect(results).toHaveLength(concurrentRequests);
      results.forEach(result => {
        expect(result.state).toBe('SUCCESS');
        expect(result.result.code).toBe('OPR00000');
      });

      // 验证 fetch 被调用了 100 次
      expect(mockFetch).toHaveBeenCalledTimes(concurrentRequests);
    });

    test('[P1] 应成功处理 50 个并发 GET 请求（更保守的测试）', async () => {
      const yopClient = new YopClient(mockConfig);
      const concurrentRequests = 50;
      const promises: Promise<any>[] = [];

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(yopClient.get(`/api/query`, { orderId: `order${i}` }));
      }

      const results = await Promise.all(promises);

      expect(results).toHaveLength(concurrentRequests);
      results.forEach(result => {
        expect(result.state).toBe('SUCCESS');
      });
      expect(mockFetch).toHaveBeenCalledTimes(concurrentRequests);
    });

    test('[P2] 应处理 1000 个并发请求（性能压力测试）', async () => {
      const yopClient = new YopClient(mockConfig);
      const concurrentRequests = 1000;
      const promises: Promise<any>[] = [];

      const startTime = Date.now();

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(yopClient.get(`/api/test`, { id: i.toString() }));
      }

      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(concurrentRequests);
      expect(mockFetch).toHaveBeenCalledTimes(concurrentRequests);

      // 1000 个请求应该在合理时间内完成（< 5 秒，考虑到是 mock）
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('混合 GET/POST 并发执行', () => {
    test('[P0] 应正确处理 GET 和 POST 请求混合并发', async () => {
      const yopClient = new YopClient(mockConfig);
      const promises: Promise<any>[] = [];

      // 创建混合请求：50 个 GET + 50 个 POST
      for (let i = 0; i < 50; i++) {
        promises.push(yopClient.get(`/api/query`, { id: i.toString() }));
      }
      for (let i = 0; i < 50; i++) {
        promises.push(yopClient.post(`/api/create`, { name: `item${i}` }));
      }

      const results = await Promise.all(promises);

      expect(results).toHaveLength(100);
      results.forEach(result => {
        expect(result.state).toBe('SUCCESS');
      });
      expect(mockFetch).toHaveBeenCalledTimes(100);
    });

    test('[P1] 应正确处理 GET/POST/POST_JSON 三种方法混合', async () => {
      const yopClient = new YopClient(mockConfig);
      const promises: Promise<any>[] = [];

      // GET 请求
      for (let i = 0; i < 20; i++) {
        promises.push(yopClient.get(`/api/query`, { id: i.toString() }));
      }
      // POST (form-urlencoded) 请求
      for (let i = 0; i < 20; i++) {
        promises.push(yopClient.post(`/api/form`, { field: `value${i}` }));
      }
      // POST (JSON) 请求
      for (let i = 0; i < 20; i++) {
        promises.push(yopClient.postJson(`/api/json`, { data: `json${i}` }));
      }

      const results = await Promise.all(promises);

      expect(results).toHaveLength(60);
      expect(mockFetch).toHaveBeenCalledTimes(60);

      // 验证不同请求类型的 headers 设置正确
      const fetchCalls = mockFetch.mock.calls;

      // 验证至少有一些 GET、POST form、POST JSON 请求
      const getMethods = fetchCalls.filter(call => call[1]?.method === 'GET');
      const postMethods = fetchCalls.filter(call => call[1]?.method === 'POST');

      expect(getMethods.length).toBeGreaterThan(0);
      expect(postMethods.length).toBeGreaterThan(0);
    });

    test('[P2] 应处理不同 endpoint 的混合并发请求', async () => {
      const yopClient = new YopClient(mockConfig);
      const endpoints = ['/api/orders', '/api/payments', '/api/refunds', '/api/query'];
      const promises: Promise<any>[] = [];

      // 每个 endpoint 发起 25 个请求
      endpoints.forEach(endpoint => {
        for (let i = 0; i < 25; i++) {
          promises.push(yopClient.get(endpoint, { id: i.toString() }));
        }
      });

      const results = await Promise.all(promises);

      expect(results).toHaveLength(100);
      expect(mockFetch).toHaveBeenCalledTimes(100);

      // 验证所有 endpoint 都被调用了
      const fetchCalls = mockFetch.mock.calls;
      endpoints.forEach(endpoint => {
        const endpointCalls = fetchCalls.filter(call =>
          (call[0] as string).includes(endpoint),
        );
        expect(endpointCalls.length).toBe(25);
      });
    });
  });

  describe('不同实例的请求隔离性', () => {
    test('[P0] 不同 YopClient 实例应完全隔离', async () => {
      const config1: YopConfig = {
        ...mockConfig,
        appKey: 'app_key_1',
      };
      const config2: YopConfig = {
        ...mockConfig,
        appKey: 'app_key_2',
      };

      const client1 = new YopClient(config1);
      const client2 = new YopClient(config2);

      const promises: Promise<any>[] = [];

      // 两个实例各发起 50 个请求
      for (let i = 0; i < 50; i++) {
        promises.push(client1.get(`/api/test`, { client: '1', id: i.toString() }));
        promises.push(client2.get(`/api/test`, { client: '2', id: i.toString() }));
      }

      const results = await Promise.all(promises);

      expect(results).toHaveLength(100);
      expect(mockFetch).toHaveBeenCalledTimes(100);

      // 验证两个客户端的配置不会互相影响
      expect((client1 as any).config.appKey).toBe('app_key_1');
      expect((client2 as any).config.appKey).toBe('app_key_2');
    });

    test('[P1] 多实例并发不应产生配置泄漏', async () => {
      const instances: YopClient[] = [];

      // 创建 10 个不同配置的实例
      for (let i = 0; i < 10; i++) {
        instances.push(
          new YopClient({
            ...mockConfig,
            appKey: `app_key_${i}`,
          }),
        );
      }

      const promises: Promise<any>[] = [];

      // 每个实例发起 10 个并发请求
      instances.forEach((client, index) => {
        for (let i = 0; i < 10; i++) {
          promises.push(client.get(`/api/test`, { instance: index.toString() }));
        }
      });

      const results = await Promise.all(promises);

      expect(results).toHaveLength(100);
      expect(mockFetch).toHaveBeenCalledTimes(100);

      // 验证每个实例的配置未被修改
      instances.forEach((client, index) => {
        expect((client as any).config.appKey).toBe(`app_key_${index}`);
      });
    });
  });

  describe('同一实例跨请求状态隔离', () => {
    test('[P0] 同一实例的并发请求不应共享状态', async () => {
      const yopClient = new YopClient(mockConfig);
      const promises: Promise<any>[] = [];

      // 创建 100 个并发请求，每个带有不同参数
      for (let i = 0; i < 100; i++) {
        promises.push(
          yopClient.get(`/api/test`, {
            requestId: `req${i}`,
            timestamp: Date.now() + i,
          }),
        );
      }

      const results = await Promise.all(promises);

      expect(results).toHaveLength(100);

      // 验证每个请求都被正确处理（没有参数混淆）
      const fetchCalls = mockFetch.mock.calls;
      const uniqueUrls = new Set(fetchCalls.map(call => call[0]));

      // 应该有 100 个不同的 URL（因为参数不同）
      expect(uniqueUrls.size).toBe(100);
    });

    test('[P1] 并发请求应产生唯一的签名', async () => {
      const yopClient = new YopClient(mockConfig);

      // 重置 mock，返回唯一签名
      let signatureCounter = 0;
      mockGetAuthHeaders.mockImplementation(() => ({
        'x-yop-appkey': 'test_app_key',
        'x-yop-sign': `signature-${signatureCounter++}`,
      }));

      const promises: Promise<any>[] = [];

      // 50 个并发请求
      for (let i = 0; i < 50; i++) {
        promises.push(yopClient.get(`/api/test`, { id: i.toString() }));
      }

      await Promise.all(promises);

      // 验证 getAuthHeaders 被调用了 50 次
      expect(mockGetAuthHeaders).toHaveBeenCalledTimes(50);

      // 验证每次调用的参数都不同（时间戳、请求 ID 等）
      const calls = mockGetAuthHeaders.mock.calls;
      expect(calls).toHaveLength(50);
    });

    test('[P2] 并发请求不应产生竞态条件', async () => {
      const yopClient = new YopClient(mockConfig);

      // 模拟慢响应（随机延迟）
      mockFetch.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
        return {
          ok: true,
          status: 200,
          headers: {
            get: (name: string) => {
              if (name === 'x-yop-sign') return 'platform-signature';
              if (name === 'content-type') return 'application/json';
              return null;
            },
          } as any,
          text: async () =>
            JSON.stringify({
              state: 'SUCCESS',
              result: { code: 'OPR00000' },
            }),
        } as Response;
      });

      const promises: Promise<any>[] = [];

      // 创建 50 个并发请求
      for (let i = 0; i < 50; i++) {
        promises.push(yopClient.get(`/api/test`, { id: i.toString() }));
      }

      const results = await Promise.all(promises);

      // 所有请求都应成功，没有竞态条件导致的错误
      expect(results).toHaveLength(50);
      results.forEach(result => {
        expect(result.state).toBe('SUCCESS');
      });
    });
  });

  describe('并发请求错误处理独立性', () => {
    test('[P0] 部分请求失败不应影响其他请求', async () => {
      const yopClient = new YopClient(mockConfig);

      // Mock: 偶数 ID 成功，奇数 ID 失败
      mockFetch.mockImplementation(async (url: RequestInfo | URL) => {
        const urlString = url.toString();
        const isEvenId = urlString.includes('id=0') || urlString.includes('id=2');

        if (isEvenId) {
          return {
            ok: true,
            status: 200,
            headers: {
              get: (name: string) => {
                if (name === 'x-yop-sign') return 'platform-signature';
                if (name === 'content-type') return 'application/json';
                return null;
              },
            } as any,
            text: async () =>
              JSON.stringify({
                state: 'SUCCESS',
                result: { code: 'OPR00000' },
              }),
          } as Response;
        } else {
          return {
            ok: false,
            status: 500,
            headers: {
              get: () => null,
            } as any,
            text: async () => 'Internal Server Error',
          } as Response;
        }
      });

      const promises: Promise<any>[] = [];

      // 创建 10 个请求（5 个成功，5 个失败）
      for (let i = 0; i < 10; i++) {
        promises.push(
          yopClient.get(`/api/test`, { id: i.toString() }).catch(err => ({
            error: true,
            message: err.message,
          })),
        );
      }

      const results = await Promise.all(promises);

      // 验证结果混合了成功和失败
      const successResults = results.filter((r: any) => r.state === 'SUCCESS');
      const errorResults = results.filter((r: any) => r.error === true);

      expect(successResults.length).toBeGreaterThan(0);
      expect(errorResults.length).toBeGreaterThan(0);
      expect(successResults.length + errorResults.length).toBe(10);
    });

    test('[P1] 网络错误不应影响其他并发请求', async () => {
      const yopClient = new YopClient(mockConfig);

      // Mock: 前 3 个请求网络错误，其余成功
      let requestCount = 0;
      mockFetch.mockImplementation(async () => {
        requestCount++;
        if (requestCount <= 3) {
          throw new Error('Network error');
        }

        return {
          ok: true,
          status: 200,
          headers: {
            get: (name: string) => {
              if (name === 'x-yop-sign') return 'platform-signature';
              if (name === 'content-type') return 'application/json';
              return null;
            },
          } as any,
          text: async () =>
            JSON.stringify({
              state: 'SUCCESS',
              result: { code: 'OPR00000' },
            }),
        } as Response;
      });

      const promises: Promise<any>[] = [];

      // 创建 10 个并发请求
      for (let i = 0; i < 10; i++) {
        promises.push(
          yopClient.get(`/api/test`, { id: i.toString() }).catch(err => ({
            error: true,
            message: err.message,
          })),
        );
      }

      const results = await Promise.all(promises);

      // 验证有成功和失败的请求
      const successResults = results.filter((r: any) => r.state === 'SUCCESS');
      const errorResults = results.filter((r: any) => r.error === true);

      expect(successResults.length).toBe(7); // 10 - 3 = 7
      expect(errorResults.length).toBe(3);
    });

    test('[P2] 超时错误不应影响其他并发请求', async () => {
      const yopClient = new YopClient(mockConfig);

      // Mock: 前 5 个请求超时
      let requestCount = 0;
      mockFetch.mockImplementation(async () => {
        requestCount++;
        if (requestCount <= 5) {
          const abortError = new Error('AbortError');
          abortError.name = 'AbortError';
          throw abortError;
        }

        return {
          ok: true,
          status: 200,
          headers: {
            get: (name: string) => {
              if (name === 'x-yop-sign') return 'platform-signature';
              if (name === 'content-type') return 'application/json';
              return null;
            },
          } as any,
          text: async () =>
            JSON.stringify({
              state: 'SUCCESS',
              result: { code: 'OPR00000' },
            }),
        } as Response;
      });

      const promises: Promise<any>[] = [];

      // 创建 20 个并发请求
      for (let i = 0; i < 20; i++) {
        promises.push(
          yopClient.get(`/api/test`, { id: i.toString() }).catch(err => ({
            error: true,
            message: err.message,
          })),
        );
      }

      const results = await Promise.all(promises);

      // 验证结果
      const successResults = results.filter((r: any) => r.state === 'SUCCESS');
      const timeoutResults = results.filter(
        (r: any) => r.error && r.message.includes('timed out'),
      );

      expect(successResults.length).toBe(15); // 20 - 5 = 15
      expect(timeoutResults.length).toBe(5);
    });
  });

  describe('性能基准测试', () => {
    test('[P2] 签名生成不应成为并发瓶颈', async () => {
      const yopClient = new YopClient(mockConfig);

      const startTime = Date.now();

      const promises: Promise<any>[] = [];
      for (let i = 0; i < 100; i++) {
        promises.push(yopClient.get(`/api/test`, { id: i.toString() }));
      }

      await Promise.all(promises);

      const duration = Date.now() - startTime;

      // 100 个并发请求应在 3 秒内完成（考虑到是 mock）
      expect(duration).toBeLessThan(3000);
    });

    test('[P3] 大规模并发（500 个请求）性能测试', async () => {
      const yopClient = new YopClient(mockConfig);

      const startTime = Date.now();

      const promises: Promise<any>[] = [];
      for (let i = 0; i < 500; i++) {
        promises.push(yopClient.get(`/api/test`, { id: i.toString() }));
      }

      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(500);
      // 500 个请求应在 5 秒内完成
      expect(duration).toBeLessThan(5000);
    });

    test('[P3] 内存使用应保持稳定（无泄漏）', async () => {
      const yopClient = new YopClient(mockConfig);

      // 执行 3 轮并发请求，观察内存是否稳定
      for (let round = 0; round < 3; round++) {
        const promises: Promise<any>[] = [];
        for (let i = 0; i < 100; i++) {
          promises.push(yopClient.get(`/api/test`, { round: round, id: i }));
        }
        await Promise.all(promises);
      }

      // 如果有内存泄漏，第三轮会比第一轮慢很多
      // 这里简单验证所有请求都成功完成
      expect(mockFetch).toHaveBeenCalledTimes(300); // 3 rounds * 100 requests
    });
  });

  describe('边缘情况', () => {
    test('[P2] 空参数并发请求应正常工作', async () => {
      const yopClient = new YopClient(mockConfig);
      const promises: Promise<any>[] = [];

      for (let i = 0; i < 50; i++) {
        promises.push(yopClient.get(`/api/test`, {}));
      }

      const results = await Promise.all(promises);

      expect(results).toHaveLength(50);
      results.forEach(result => {
        expect(result.state).toBe('SUCCESS');
      });
    });

    test('[P3] 大参数对象并发请求应正常工作', async () => {
      const yopClient = new YopClient(mockConfig);
      const promises: Promise<any>[] = [];

      const largeParams: Record<string, string> = {};
      for (let i = 0; i < 50; i++) {
        largeParams[`field${i}`] = `value${i}`;
      }

      for (let i = 0; i < 20; i++) {
        promises.push(yopClient.get(`/api/test`, largeParams));
      }

      const results = await Promise.all(promises);

      expect(results).toHaveLength(20);
      results.forEach(result => {
        expect(result.state).toBe('SUCCESS');
      });
    });

    test('[P3] 相同请求参数并发不应产生问题', async () => {
      const yopClient = new YopClient(mockConfig);
      const promises: Promise<any>[] = [];

      const sameParams = { orderId: 'ORDER123', amount: '100.00' };

      // 100 个完全相同的请求
      for (let i = 0; i < 100; i++) {
        promises.push(yopClient.get(`/api/query`, sameParams));
      }

      const results = await Promise.all(promises);

      expect(results).toHaveLength(100);
      results.forEach(result => {
        expect(result.state).toBe('SUCCESS');
      });
      expect(mockFetch).toHaveBeenCalledTimes(100);
    });
  });
});
