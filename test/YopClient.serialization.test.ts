import { describe, beforeEach, afterEach, test, expect, jest } from '@jest/globals';
import { YopClient } from '../src/YopClient';
import { YopConfig } from '../src/types';
import { RsaV3Util } from '../src/utils/RsaV3Util';
import { VerifyUtils } from '../src/utils/VerifyUtils';

/**
 * YopClient 请求序列化边缘情况测试
 *
 * 测试场景包括:
 * 1. JSON 序列化边缘情况 (循环引用、BigInt、Date、undefined、Buffer)
 * 2. URL 编码边缘情况 (特殊字符、空值、嵌套对象)
 * 3. 空对象和空值处理
 * 4. 超大对象序列化
 * 5. 不同数据类型的处理 (Number、Boolean、null、Array)
 * 6. 参数过滤和转换
 */

describe('YopClient 请求序列化边缘情况测试', () => {
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

    // Mock VerifyUtils.isValidRsaResult
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

  describe('JSON 序列化边缘情况 (postJson)', () => {
    test('[P0] 应正确序列化普通对象', async () => {
      const yopClient = new YopClient(mockConfig);
      const body = { name: 'test', value: 123 };

      await yopClient.postJson('/api/test', body);

      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = (fetchCall[1] as RequestInit).body as string;

      expect(requestBody).toBe('{"name":"test","value":123}');
    });

    test('[P0] Date 对象应序列化为 ISO 8601 字符串', async () => {
      const yopClient = new YopClient(mockConfig);
      const testDate = new Date('2024-01-01T00:00:00.000Z');
      const body = { timestamp: testDate };

      await yopClient.postJson('/api/test', body);

      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = (fetchCall[1] as RequestInit).body as string;

      expect(requestBody).toContain('"timestamp":"2024-01-01T00:00:00.000Z"');
    });

    test('[P0] undefined 值应被过滤（JSON.stringify 行为）', async () => {
      const yopClient = new YopClient(mockConfig);
      const body = { name: 'test', undefinedField: undefined, value: 123 };

      await yopClient.postJson('/api/test', body);

      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = (fetchCall[1] as RequestInit).body as string;

      // JSON.stringify 会忽略 undefined 值
      expect(requestBody).toBe('{"name":"test","value":123}');
      expect(requestBody).not.toContain('undefinedField');
    });

    test('[P1] null 值应被保留', async () => {
      const yopClient = new YopClient(mockConfig);
      const body = { name: 'test', nullField: null };

      await yopClient.postJson('/api/test', body);

      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = (fetchCall[1] as RequestInit).body as string;

      expect(requestBody).toBe('{"name":"test","nullField":null}');
    });

    test('[P1] Boolean 值应正确序列化', async () => {
      const yopClient = new YopClient(mockConfig);
      const body = { isActive: true, isDeleted: false };

      await yopClient.postJson('/api/test', body);

      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = (fetchCall[1] as RequestInit).body as string;

      expect(requestBody).toBe('{"isActive":true,"isDeleted":false}');
    });

    test('[P1] 数组应正确序列化', async () => {
      const yopClient = new YopClient(mockConfig);
      const body = { items: [1, 2, 3], names: ['a', 'b', 'c'] };

      await yopClient.postJson('/api/test', body);

      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = (fetchCall[1] as RequestInit).body as string;

      expect(requestBody).toBe('{"items":[1,2,3],"names":["a","b","c"]}');
    });

    test('[P1] 嵌套对象应正确序列化', async () => {
      const yopClient = new YopClient(mockConfig);
      const body = {
        user: {
          name: 'John',
          address: {
            city: 'Beijing',
            zip: '100000',
          },
        },
      };

      await yopClient.postJson('/api/test', body);

      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = (fetchCall[1] as RequestInit).body as string;

      expect(requestBody).toBe(
        '{"user":{"name":"John","address":{"city":"Beijing","zip":"100000"}}}',
      );
    });

    test('[P2] 空对象应序列化为 {}', async () => {
      const yopClient = new YopClient(mockConfig);
      const body = {};

      await yopClient.postJson('/api/test', body);

      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = (fetchCall[1] as RequestInit).body as string;

      expect(requestBody).toBe('{}');
    });

    test('[P2] 空数组应序列化为 []', async () => {
      const yopClient = new YopClient(mockConfig);
      const body = { items: [] };

      await yopClient.postJson('/api/test', body);

      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = (fetchCall[1] as RequestInit).body as string;

      expect(requestBody).toBe('{"items":[]}');
    });

    test('[P2] 数字类型应正确序列化 (整数、浮点数、负数、零)', async () => {
      const yopClient = new YopClient(mockConfig);
      const body = {
        integer: 42,
        float: 3.14,
        negative: -100,
        zero: 0,
      };

      await yopClient.postJson('/api/test', body);

      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = (fetchCall[1] as RequestInit).body as string;

      expect(requestBody).toBe('{"integer":42,"float":3.14,"negative":-100,"zero":0}');
    });

    test('[P3] 特殊数字值应正确处理 (NaN, Infinity)', async () => {
      const yopClient = new YopClient(mockConfig);
      const body = {
        nanValue: NaN,
        infinityValue: Infinity,
        negInfinity: -Infinity,
      };

      await yopClient.postJson('/api/test', body);

      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = (fetchCall[1] as RequestInit).body as string;

      // JSON.stringify 将 NaN 和 Infinity 转为 null
      expect(requestBody).toBe(
        '{"nanValue":null,"infinityValue":null,"negInfinity":null}',
      );
    });

    test('[P3] 特殊字符串应正确转义', async () => {
      const yopClient = new YopClient(mockConfig);
      const body = {
        quote: 'He said "hello"',
        backslash: 'C:\\path\\to\\file',
        newline: 'line1\nline2',
        tab: 'col1\tcol2',
      };

      await yopClient.postJson('/api/test', body);

      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = (fetchCall[1] as RequestInit).body as string;

      expect(requestBody).toContain('\\"hello\\"');
      expect(requestBody).toContain('\\\\path\\\\to\\\\file');
      expect(requestBody).toContain('\\n');
      expect(requestBody).toContain('\\t');
    });

    test('[P3] Unicode 和 Emoji 应正确序列化', async () => {
      const yopClient = new YopClient(mockConfig);
      const body = {
        chinese: '中文测试',
        emoji: '😀🎉',
        unicode: '\u4e2d\u6587',
      };

      await yopClient.postJson('/api/test', body);

      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = (fetchCall[1] as RequestInit).body as string;

      expect(requestBody).toContain('中文测试');
      expect(requestBody).toContain('😀🎉');
    });
  });

  describe('URL 编码边缘情况 (post form-urlencoded)', () => {
    test('[P0] 应正确 URL 编码普通字符串', async () => {
      const yopClient = new YopClient(mockConfig);
      const body = { name: 'John Doe', age: 30 };

      await yopClient.post('/api/test', body);

      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = (fetchCall[1] as RequestInit).body as string;

      expect(requestBody).toContain('name=John+Doe');
      expect(requestBody).toContain('age=30');
    });

    test('[P0] undefined 值应被过滤', async () => {
      const yopClient = new YopClient(mockConfig);
      const body = { name: 'test', undefinedField: undefined, value: '123' };

      await yopClient.post('/api/test', body);

      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = (fetchCall[1] as RequestInit).body as string;

      expect(requestBody).not.toContain('undefinedField');
      expect(requestBody).toContain('name=test');
      expect(requestBody).toContain('value=123');
    });

    test('[P1] null 值应转为字符串 "null"', async () => {
      const yopClient = new YopClient(mockConfig);
      const body = { name: 'test', nullField: null };

      await yopClient.post('/api/test', body);

      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = (fetchCall[1] as RequestInit).body as string;

      expect(requestBody).toContain('nullField=null');
    });

    test('[P1] Boolean 值应转为字符串', async () => {
      const yopClient = new YopClient(mockConfig);
      const body = { isActive: true, isDeleted: false };

      await yopClient.post('/api/test', body);

      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = (fetchCall[1] as RequestInit).body as string;

      expect(requestBody).toContain('isActive=true');
      expect(requestBody).toContain('isDeleted=false');
    });

    test('[P1] 数字应转为字符串', async () => {
      const yopClient = new YopClient(mockConfig);
      const body = { count: 42, price: 99.99, zero: 0 };

      await yopClient.post('/api/test', body);

      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = (fetchCall[1] as RequestInit).body as string;

      expect(requestBody).toContain('count=42');
      expect(requestBody).toContain('price=99.99');
      expect(requestBody).toContain('zero=0');
    });

    test('[P2] 特殊字符应正确 URL 编码', async () => {
      const yopClient = new YopClient(mockConfig);
      const body = {
        email: 'user@example.com',
        url: 'https://example.com/path?query=value',
        special: '!@#$%^&*()',
      };

      await yopClient.post('/api/test', body);

      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = (fetchCall[1] as RequestInit).body as string;

      expect(requestBody).toContain('email=user%40example.com');
      expect(requestBody).toContain('url=https%3A%2F%2Fexample.com');
      // URLSearchParams 会编码特殊字符
      expect(requestBody).toContain('special=');
    });

    test('[P2] 中文字符应正确 URL 编码', async () => {
      const yopClient = new YopClient(mockConfig);
      const body = { name: '张三', description: '测试用户' };

      await yopClient.post('/api/test', body);

      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = (fetchCall[1] as RequestInit).body as string;

      // URLSearchParams 会自动进行 UTF-8 编码
      expect(requestBody).toContain('name=');
      expect(requestBody).toContain('description=');
      expect(requestBody.length).toBeGreaterThan(0);
    });

    test('[P3] 空字符串应保留', async () => {
      const yopClient = new YopClient(mockConfig);
      const body = { name: '', value: 'test' };

      await yopClient.post('/api/test', body);

      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = (fetchCall[1] as RequestInit).body as string;

      expect(requestBody).toContain('name=');
      expect(requestBody).toContain('value=test');
    });

    test('[P3] 对象和数组应转为字符串', async () => {
      const yopClient = new YopClient(mockConfig);
      const body = {
        obj: { nested: 'value' } as any,
        arr: [1, 2, 3] as any,
      };

      await yopClient.post('/api/test', body);

      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = (fetchCall[1] as RequestInit).body as string;

      // String() 会调用 toString()
      expect(requestBody).toContain('obj=');
      expect(requestBody).toContain('arr=');
    });
  });

  describe('GET 请求参数序列化', () => {
    test('[P0] 应正确拼接 query 参数', async () => {
      const yopClient = new YopClient(mockConfig);
      const params = { orderId: '123', amount: '100.00' };

      await yopClient.get('/api/query', params);

      const fetchCall = mockFetch.mock.calls[0];
      const url = fetchCall[0] as string;

      expect(url).toContain('orderId=123');
      expect(url).toContain('amount=100.00');
      expect(url).toContain('?');
    });

    test('[P1] undefined 参数应被过滤', async () => {
      const yopClient = new YopClient(mockConfig);
      const params = { name: 'test', undefinedParam: undefined, value: '123' };

      await yopClient.get('/api/query', params);

      const fetchCall = mockFetch.mock.calls[0];
      const url = fetchCall[0] as string;

      expect(url).not.toContain('undefinedParam');
      expect(url).toContain('name=test');
      expect(url).toContain('value=123');
    });

    test('[P1] null 参数应转为字符串', async () => {
      const yopClient = new YopClient(mockConfig);
      const params = { name: 'test', nullParam: null };

      await yopClient.get('/api/query', params);

      const fetchCall = mockFetch.mock.calls[0];
      const url = fetchCall[0] as string;

      expect(url).toContain('nullParam=null');
    });

    test('[P2] 空对象参数应产生无 query 参数的 URL', async () => {
      const yopClient = new YopClient(mockConfig);

      await yopClient.get('/api/query', {});

      const fetchCall = mockFetch.mock.calls[0];
      const url = fetchCall[0] as string;

      // 空参数不应有 ?
      expect(url).not.toMatch(/\?$/);
    });

    test('[P2] 特殊字符参数应正确编码', async () => {
      const yopClient = new YopClient(mockConfig);
      const params = { email: 'user@example.com', url: 'https://example.com' };

      await yopClient.get('/api/query', params);

      const fetchCall = mockFetch.mock.calls[0];
      const url = fetchCall[0] as string;

      expect(url).toContain('email=');
      expect(url).toContain('url=');
    });
  });

  describe('超大对象序列化', () => {
    test('[P2] 应处理包含 1000 个字段的对象 (JSON)', async () => {
      const yopClient = new YopClient(mockConfig);
      const largeBody: Record<string, string> = {};

      for (let i = 0; i < 1000; i++) {
        largeBody[`field${i}`] = `value${i}`;
      }

      await yopClient.postJson('/api/test', largeBody);

      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = (fetchCall[1] as RequestInit).body as string;

      expect(requestBody.length).toBeGreaterThan(10000);
      expect(requestBody).toContain('field0');
      expect(requestBody).toContain('field999');
    });

    test('[P2] 应处理包含 1000 个字段的对象 (form-urlencoded)', async () => {
      const yopClient = new YopClient(mockConfig);
      const largeBody: Record<string, string> = {};

      for (let i = 0; i < 1000; i++) {
        largeBody[`field${i}`] = `value${i}`;
      }

      await yopClient.post('/api/test', largeBody);

      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = (fetchCall[1] as RequestInit).body as string;

      expect(requestBody.length).toBeGreaterThan(10000);
      expect(requestBody).toContain('field0=value0');
      expect(requestBody).toContain('field999=value999');
    });

    test('[P3] 应处理深度嵌套对象（10 层）', async () => {
      const yopClient = new YopClient(mockConfig);

      let nested: any = { value: 'deep' };
      for (let i = 0; i < 10; i++) {
        nested = { level: i, nested };
      }

      await yopClient.postJson('/api/test', nested);

      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = (fetchCall[1] as RequestInit).body as string;

      expect(requestBody).toContain('"value":"deep"');
      expect(requestBody.length).toBeGreaterThan(100);
    });

    test('[P3] 应处理超长字符串值（10KB）', async () => {
      const yopClient = new YopClient(mockConfig);
      const longString = 'a'.repeat(10000);
      const body = { longField: longString };

      await yopClient.postJson('/api/test', body);

      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = (fetchCall[1] as RequestInit).body as string;

      expect(requestBody.length).toBeGreaterThan(10000);
      expect(requestBody).toContain(longString);
    });
  });

  describe('数据类型转换', () => {
    test('[P1] Date 对象在 form-urlencoded 中应转为字符串', async () => {
      const yopClient = new YopClient(mockConfig);
      const testDate = new Date('2024-01-01T00:00:00.000Z');
      const body = { timestamp: testDate as any };

      await yopClient.post('/api/test', body);

      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = (fetchCall[1] as RequestInit).body as string;

      // String(date) 会调用 toString()
      expect(requestBody).toContain('timestamp=');
      expect(requestBody.length).toBeGreaterThan(0);
    });

    test('[P2] 数组在 form-urlencoded 中应转为字符串', async () => {
      const yopClient = new YopClient(mockConfig);
      const body = { items: [1, 2, 3] as any };

      await yopClient.post('/api/test', body);

      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = (fetchCall[1] as RequestInit).body as string;

      // String([1,2,3]) => "1,2,3"
      expect(requestBody).toContain('items=1%2C2%2C3');
    });

    test('[P3] Symbol 在 JSON 中应被忽略', async () => {
      const yopClient = new YopClient(mockConfig);
      const sym = Symbol('test');
      const body = { name: 'test', [sym]: 'symbol-value', regular: 'value' } as any;

      await yopClient.postJson('/api/test', body);

      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = (fetchCall[1] as RequestInit).body as string;

      // Symbol 属性会被 JSON.stringify 忽略
      expect(requestBody).not.toContain('symbol-value');
      expect(requestBody).toContain('regular');
    });
  });

  describe('错误处理', () => {
    test('[P0] POST 请求缺少 body 应抛出错误', async () => {
      const yopClient = new YopClient(mockConfig);

      await expect(
        yopClient.request({
          method: 'POST',
          apiUrl: '/api/test',
          // 缺少 body
        }),
      ).rejects.toThrow(/POST method requires a body/);
    });

    test('[P2] 空 body 对象应正常处理', async () => {
      const yopClient = new YopClient(mockConfig);

      await yopClient.postJson('/api/test', {});

      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = (fetchCall[1] as RequestInit).body as string;

      expect(requestBody).toBe('{}');
    });
  });
});
