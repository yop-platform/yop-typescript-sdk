import { describe, beforeEach, test, expect, jest } from '@jest/globals';
import { YopClient } from '../src/YopClient';
import { YopConfig } from '../src/types';
import * as RsaV3UtilModule from '../src/utils/RsaV3Util';

/**
 * YopClient 超时机制测试
 *
 * 测试重点：
 * 1. 默认超时时间（10秒）
 * 2. 自定义超时时间
 * 3. AbortController 正确触发
 * 4. 超时错误消息清晰
 * 5. 超时后资源正确清理
 * 6. 并发请求各自独立超时
 */

const mockSecretKey = `-----BEGIN PRIVATE KEY-----
MOCK_SECRET_KEY_CONTENT
-----END PRIVATE KEY-----`;

const mockYopPublicKey = `-----BEGIN PUBLIC KEY-----
MOCK_YOP_PUBLIC_KEY
-----END PUBLIC KEY-----`;

describe('YopClient 超时机制测试', () => {
  let mockFetch: jest.MockedFunction<typeof fetch>;
  let mockAbort: jest.Mock;
  let mockSignal: { aborted: boolean };
  let getAuthHeadersSpy: jest.SpiedFunction<typeof RsaV3UtilModule.RsaV3Util.getAuthHeaders>;

  const mockConfig: YopConfig = {
    appKey: 'test-app-key',
    secretKey: mockSecretKey,
    yopPublicKey: mockYopPublicKey,
    yopApiBaseUrl: 'https://test-api.yeepay.com',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock fetch
    mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
    global.fetch = mockFetch;

    // Mock AbortController
    mockAbort = jest.fn();
    mockSignal = { aborted: false };
    global.AbortController = jest.fn(() => ({
      abort: mockAbort,
      signal: mockSignal,
    })) as any;

    // Mock RsaV3Util.getAuthHeaders
    getAuthHeadersSpy = jest.spyOn(RsaV3UtilModule.RsaV3Util, 'getAuthHeaders')
      .mockReturnValue({
        'Authorization': 'YOP-RSA3-TEST test-signature',
        'x-yop-appkey': mockConfig.appKey,
      });

    // Mock setTimeout and clearTimeout to avoid real delays
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('默认超时时间', () => {
    test('[P0] 应使用默认超时时间 10 秒', async () => {
      const abortError = new Error('AbortError');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValue(abortError);

      const yopClient = new YopClient(mockConfig);
      const requestPromise = yopClient.get('/api/test', {});

      // Fast-forward time to trigger timeout
      jest.advanceTimersByTime(10000);

      await expect(requestPromise).rejects.toThrow(/timed out after 10 seconds/);
    });

    test('[P0] 默认超时时间应在 10 秒时触发 AbortController', async () => {
      const abortError = new Error('AbortError');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValue(abortError);

      const yopClient = new YopClient(mockConfig);
      const requestPromise = yopClient.get('/api/test', {});

      // Advance time to just before timeout
      jest.advanceTimersByTime(9999);
      expect(mockAbort).not.toHaveBeenCalled();

      // Advance to timeout
      jest.advanceTimersByTime(1);

      await expect(requestPromise).rejects.toThrow();
      expect(mockAbort).toHaveBeenCalledTimes(1);
    });
  });

  describe('自定义超时时间', () => {
    test('[P0] 应支持自定义超时时间（5 秒）', async () => {
      const abortError = new Error('AbortError');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValue(abortError);

      const yopClient = new YopClient(mockConfig);
      const requestPromise = yopClient.get('/api/test', {}, 5000);

      jest.advanceTimersByTime(5000);

      await expect(requestPromise).rejects.toThrow(/timed out after 5 seconds/);
    });

    test('[P1] 应支持自定义超时时间（30 秒）', async () => {
      const abortError = new Error('AbortError');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValue(abortError);

      const yopClient = new YopClient(mockConfig);
      const requestPromise = yopClient.get('/api/test', {}, 30000);

      // 不应在 10 秒时超时
      jest.advanceTimersByTime(10000);
      expect(mockAbort).not.toHaveBeenCalled();

      // 应在 30 秒时超时
      jest.advanceTimersByTime(20000);

      await expect(requestPromise).rejects.toThrow(/timed out after 30 seconds/);
    });

    test('[P1] POST 请求应支持自定义超时时间', async () => {
      const abortError = new Error('AbortError');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValue(abortError);

      const yopClient = new YopClient(mockConfig);
      const requestPromise = yopClient.post('/api/test', { data: 'test' }, 'application/json', 15000);

      jest.advanceTimersByTime(15000);

      await expect(requestPromise).rejects.toThrow(/timed out after 15 seconds/);
    });

    test('[P2] 应支持非常短的超时时间（1 秒）', async () => {
      const abortError = new Error('AbortError');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValue(abortError);

      const yopClient = new YopClient(mockConfig);
      const requestPromise = yopClient.get('/api/test', {}, 1000);

      jest.advanceTimersByTime(1000);

      await expect(requestPromise).rejects.toThrow(/timed out after 1 seconds/);
    });

    test('[P3] 应支持超长超时时间（1 小时）', async () => {
      const abortError = new Error('AbortError');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValue(abortError);

      const yopClient = new YopClient(mockConfig);
      const requestPromise = yopClient.get('/api/test', {}, 3600000); // 1 hour

      // 不应在 10 秒或 1 分钟时超时
      jest.advanceTimersByTime(60000);
      expect(mockAbort).not.toHaveBeenCalled();

      // 应在 1 小时时超时
      jest.advanceTimersByTime(3540000);

      await expect(requestPromise).rejects.toThrow(/timed out after 3600 seconds/);
    });
  });

  describe('AbortController 触发机制', () => {
    test('[P0] 超时应调用 AbortController.abort()', async () => {
      const abortError = new Error('AbortError');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValue(abortError);

      const yopClient = new YopClient(mockConfig);
      const requestPromise = yopClient.get('/api/test', {});

      jest.advanceTimersByTime(10000);

      await expect(requestPromise).rejects.toThrow();
      expect(mockAbort).toHaveBeenCalledTimes(1);
    });

    test('[P0] fetch 应接收到 AbortController.signal', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        text: jest.fn().mockResolvedValue('{}'),
      } as any);

      const yopClient = new YopClient(mockConfig);
      await yopClient.get('/api/test', {});

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          signal: mockSignal,
        })
      );
    });

    test('[P1] 成功的请求不应触发 abort', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        text: jest.fn().mockResolvedValue(JSON.stringify({ state: 'SUCCESS' })),
      } as any);

      const yopClient = new YopClient(mockConfig);
      await yopClient.get('/api/test', {});

      expect(mockAbort).not.toHaveBeenCalled();
    });
  });

  describe('超时错误消息', () => {
    test('[P0] 应提供清晰的超时错误消息（包含超时时间）', async () => {
      const abortError = new Error('AbortError');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValue(abortError);

      const yopClient = new YopClient(mockConfig);
      const requestPromise = yopClient.get('/api/test', {}, 8000);

      jest.advanceTimersByTime(8000);

      await expect(requestPromise).rejects.toThrow(
        'YeePay API request timed out after 8 seconds.'
      );
    });

    test('[P1] 超时错误应与网络错误区分开', async () => {
      // 测试超时错误
      const abortError = new Error('AbortError');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValue(abortError);

      const yopClient = new YopClient(mockConfig);
      const timeoutPromise = yopClient.get('/api/test', {});
      jest.advanceTimersByTime(10000);

      await expect(timeoutPromise).rejects.toThrow(/timed out/);

      // 测试网络错误
      mockFetch.mockRejectedValue(new Error('Network connection failed'));
      const networkErrorPromise = yopClient.get('/api/test2', {});

      await expect(networkErrorPromise).rejects.toThrow(/Network error/);
      await expect(networkErrorPromise).rejects.not.toThrow(/timed out/);
    });
  });

  describe('资源清理', () => {
    test('[P0] 超时后应清理 setTimeout', async () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      const abortError = new Error('AbortError');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValue(abortError);

      const yopClient = new YopClient(mockConfig);
      const requestPromise = yopClient.get('/api/test', {});

      jest.advanceTimersByTime(10000);

      await expect(requestPromise).rejects.toThrow();
      expect(clearTimeoutSpy).toHaveBeenCalled();

      clearTimeoutSpy.mockRestore();
    });

    test('[P0] 成功的请求应清理 setTimeout', async () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        text: jest.fn().mockResolvedValue(JSON.stringify({ state: 'SUCCESS' })),
      } as any);

      const yopClient = new YopClient(mockConfig);
      await yopClient.get('/api/test', {});

      expect(clearTimeoutSpy).toHaveBeenCalled();

      clearTimeoutSpy.mockRestore();
    });

    test('[P1] 网络错误也应清理 setTimeout', async () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      mockFetch.mockRejectedValue(new Error('Network connection failed'));

      const yopClient = new YopClient(mockConfig);
      const requestPromise = yopClient.get('/api/test', {});

      await expect(requestPromise).rejects.toThrow(/Network error/);
      expect(clearTimeoutSpy).toHaveBeenCalled();

      clearTimeoutSpy.mockRestore();
    });
  });

  describe('并发请求超时独立性', () => {
    test('[P1] 多个并发请求应各自独立超时', async () => {
      // 设置不同的超时时间
      const abortError = new Error('AbortError');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValue(abortError);

      const yopClient = new YopClient(mockConfig);
      const promise1 = yopClient.get('/api/test1', {}, 5000);
      const promise2 = yopClient.get('/api/test2', {}, 10000);
      const promise3 = yopClient.get('/api/test3', {}, 15000);

      // 5 秒后，只有 promise1 应超时
      jest.advanceTimersByTime(5000);
      await expect(promise1).rejects.toThrow(/timed out after 5 seconds/);

      // 10 秒后，promise2 应超时
      jest.advanceTimersByTime(5000);
      await expect(promise2).rejects.toThrow(/timed out after 10 seconds/);

      // 15 秒后，promise3 应超时
      jest.advanceTimersByTime(5000);
      await expect(promise3).rejects.toThrow(/timed out after 15 seconds/);
    });

    test('[P2] 一个请求超时不应影响其他请求', async () => {
      const yopClient = new YopClient(mockConfig);

      // 第一个请求会超时
      const abortError = new Error('AbortError');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValueOnce(abortError);

      const promise1 = yopClient.get('/api/test1', {}, 5000);
      jest.advanceTimersByTime(5000);
      await expect(promise1).rejects.toThrow(/timed out/);

      // 第二个请求应正常工作
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        text: jest.fn().mockResolvedValue(JSON.stringify({ state: 'SUCCESS' })),
      } as any);

      const promise2 = yopClient.get('/api/test2', {});
      await expect(promise2).resolves.toBeDefined();
    });
  });

  describe('边缘情况', () => {
    test('[P2] 超时时间为 0 应立即触发超时', async () => {
      const abortError = new Error('AbortError');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValue(abortError);

      const yopClient = new YopClient(mockConfig);
      const requestPromise = yopClient.get('/api/test', {}, 0);

      jest.advanceTimersByTime(0);

      await expect(requestPromise).rejects.toThrow(/timed out after 0 seconds/);
    });

    test('[P3] 非常大的超时时间应正常工作', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        text: jest.fn().mockResolvedValue(JSON.stringify({ state: 'SUCCESS' })),
      } as any);

      const yopClient = new YopClient(mockConfig);
      const maxSafeTimeout = Number.MAX_SAFE_INTEGER;

      // 应该能够设置超大超时时间而不报错
      expect(() => yopClient.get('/api/test', {}, maxSafeTimeout)).not.toThrow();
    });

    test('[P3] 负数超时时间应被视为 0 或立即超时', async () => {
      const abortError = new Error('AbortError');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValue(abortError);

      const yopClient = new YopClient(mockConfig);
      const requestPromise = yopClient.get('/api/test', {}, -1000);

      jest.advanceTimersByTime(0);

      // 负数超时应立即触发或被视为 0
      await expect(requestPromise).rejects.toThrow();
    });
  });

  describe('不同请求方法的超时行为', () => {
    test('[P1] GET 请求应正确处理超时', async () => {
      const abortError = new Error('AbortError');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValue(abortError);

      const yopClient = new YopClient(mockConfig);
      const requestPromise = yopClient.get('/api/test', { param: 'value' }, 5000);

      jest.advanceTimersByTime(5000);

      await expect(requestPromise).rejects.toThrow(/timed out after 5 seconds/);
    });

    test('[P1] POST (form-urlencoded) 应正确处理超时', async () => {
      const abortError = new Error('AbortError');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValue(abortError);

      const yopClient = new YopClient(mockConfig);
      const requestPromise = yopClient.post(
        '/api/test',
        { data: 'value' },
        'application/x-www-form-urlencoded',
        5000
      );

      jest.advanceTimersByTime(5000);

      await expect(requestPromise).rejects.toThrow(/timed out after 5 seconds/);
    });

    test('[P1] POST (JSON) 应正确处理超时', async () => {
      const abortError = new Error('AbortError');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValue(abortError);

      const yopClient = new YopClient(mockConfig);
      const requestPromise = yopClient.postJson(
        '/api/test',
        { data: 'value' },
        5000
      );

      jest.advanceTimersByTime(5000);

      await expect(requestPromise).rejects.toThrow(/timed out after 5 seconds/);
    });
  });
});
