/**
 * Test Utility Functions
 *
 * 提供测试辅助函数，简化测试代码编写
 *
 * @example
 * ```typescript
 * import { createMockResponse, waitFor, retry } from './helpers/test-utils';
 *
 * test('example', async () => {
 *   const response = createMockResponse({ code: 'OPR00000' });
 *   await waitFor(() => someCondition, 5000);
 * });
 * ```
 */

import type { YopResponse } from '../../src/types';

/**
 * 创建模拟的成功响应
 *
 * @param result - 响应结果对象
 * @param headers - 可选的响应头
 * @returns Response 对象
 */
export function createMockSuccessResponse(
  result: Record<string, unknown>,
  headers?: Record<string, string>,
): Response {
  const responseData: YopResponse = {
    state: 'SUCCESS',
    result: {
      code: 'OPR00000',
      ...result,
    },
  };

  return new Response(JSON.stringify(responseData), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'x-yop-sign': 'mock-signature',
      ...headers,
    },
  });
}

/**
 * 创建模拟的失败响应
 *
 * @param errorCode - 错误码
 * @param errorMessage - 错误消息
 * @param headers - 可选的响应头
 * @returns Response 对象
 */
export function createMockErrorResponse(
  errorCode: string,
  errorMessage: string,
  headers?: Record<string, string>,
): Response {
  const responseData: YopResponse = {
    state: 'FAILURE',
    error: {
      code: errorCode,
      message: errorMessage,
    },
  };

  return new Response(JSON.stringify(responseData), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'x-yop-sign': 'mock-signature',
      ...headers,
    },
  });
}

/**
 * 等待条件满足
 *
 * @param predicate - 条件判断函数
 * @param timeoutMs - 超时时间（毫秒，默认 5000）
 * @param intervalMs - 检查间隔（毫秒，默认 100）
 * @returns Promise
 */
export async function waitFor(
  predicate: () => boolean | Promise<boolean>,
  timeoutMs = 5000,
  intervalMs = 100,
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const result = await predicate();
    if (result) {
      return;
    }
    await sleep(intervalMs);
  }

  throw new Error(`Condition not met within ${timeoutMs}ms`);
}

/**
 * 睡眠指定时间
 *
 * @param ms - 毫秒数
 * @returns Promise
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 重试操作
 *
 * @param operation - 待重试的操作
 * @param maxRetries - 最大重试次数（默认 3）
 * @param delayMs - 重试延迟（毫秒，默认 100）
 * @returns 操作结果
 */
export async function retry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delayMs = 100,
): Promise<T> {
  let lastError: Error | undefined;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries) {
        await sleep(delayMs * Math.pow(2, i)); // 指数退避
      }
    }
  }

  throw lastError || new Error('Retry failed');
}

/**
 * 生成随机字符串
 *
 * @param length - 字符串长度
 * @param charset - 字符集（默认字母数字）
 * @returns 随机字符串
 */
export function randomString(
  length: number,
  charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return result;
}

/**
 * 生成随机数字
 *
 * @param min - 最小值（包含）
 * @param max - 最大值（包含）
 * @returns 随机数字
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 生成唯一订单号
 *
 * @param prefix - 前缀（默认 'ORDER'）
 * @returns 订单号
 */
export function generateOrderId(prefix = 'ORDER'): string {
  const timestamp = Date.now().toString(36);
  const random = randomString(6);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * 深度克隆对象
 *
 * @param obj - 待克隆的对象
 * @returns 克隆后的对象
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * 合并对象（深度合并）
 *
 * @param target - 目标对象
 * @param source - 源对象
 * @returns 合并后的对象
 */
export function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Partial<T>,
): T {
  const result = { ...target };

  Object.keys(source).forEach((key) => {
    const sourceValue = source[key];
    const targetValue = result[key];

    if (
      sourceValue &&
      typeof sourceValue === 'object' &&
      !Array.isArray(sourceValue) &&
      targetValue &&
      typeof targetValue === 'object' &&
      !Array.isArray(targetValue)
    ) {
      result[key] = deepMerge(
        targetValue as Record<string, unknown>,
        sourceValue as Record<string, unknown>,
      ) as T[Extract<keyof T, string>];
    } else {
      result[key] = sourceValue as T[Extract<keyof T, string>];
    }
  });

  return result;
}

/**
 * 批量执行异步操作
 *
 * @param operations - 操作列表
 * @param concurrency - 并发数（默认 10）
 * @returns 所有操作结果
 */
export async function batchExecute<T>(
  operations: (() => Promise<T>)[],
  concurrency = 10,
): Promise<T[]> {
  const results: T[] = [];
  const executing: Promise<void>[] = [];

  for (const operation of operations) {
    const promise = operation().then((result) => {
      results.push(result);
      executing.splice(executing.indexOf(promise), 1);
    });

    executing.push(promise);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  return results;
}

/**
 * 测量函数执行时间
 *
 * @param fn - 待测量的函数
 * @returns 执行时间（毫秒）和函数结果
 */
export async function measureTime<T>(
  fn: () => Promise<T> | T,
): Promise<{ duration: number; result: T }> {
  const startTime = performance.now();
  const result = await fn();
  const duration = performance.now() - startTime;

  return { duration, result };
}

/**
 * 捕获控制台输出
 *
 * @param fn - 执行的函数
 * @returns 控制台输出和函数结果
 */
export async function captureConsole<T>(
  fn: () => Promise<T> | T,
): Promise<{ logs: string[]; warns: string[]; errors: string[]; result: T }> {
  const logs: string[] = [];
  const warns: string[] = [];
  const errors: string[] = [];

  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  console.log = (...args: unknown[]) => logs.push(args.join(' '));
  console.warn = (...args: unknown[]) => warns.push(args.join(' '));
  console.error = (...args: unknown[]) => errors.push(args.join(' '));

  try {
    const result = await fn();
    return { logs, warns, errors, result };
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
  }
}

/**
 * 模拟网络延迟
 *
 * @param minMs - 最小延迟（毫秒）
 * @param maxMs - 最大延迟（毫秒）
 * @returns Promise
 */
export async function simulateNetworkDelay(
  minMs = 100,
  maxMs = 500,
): Promise<void> {
  const delay = randomInt(minMs, maxMs);
  await sleep(delay);
}

/**
 * 创建临时环境变量
 *
 * @param vars - 环境变量对象
 * @param fn - 执行的函数
 * @returns 函数结果
 */
export async function withEnv<T>(
  vars: Record<string, string>,
  fn: () => Promise<T> | T,
): Promise<T> {
  const originalEnv = { ...process.env };

  Object.entries(vars).forEach(([key, value]) => {
    process.env[key] = value;
  });

  try {
    return await fn();
  } finally {
    process.env = originalEnv;
  }
}

/**
 * 创建测试用的 YopConfig
 *
 * @param overrides - 覆盖的配置项
 * @returns YopConfig 对象
 */
export function createTestConfig(overrides?: Record<string, unknown>): {
  appKey: string;
  secretKey: string;
  yopPublicKey: string;
  apiBaseUrl: string;
  timeout?: number;
} {
  return {
    appKey: 'TEST_APP_KEY',
    secretKey: `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDqnRdaOxxj6CzK
TEST_SECRET_KEY_CONTENT
-----END PRIVATE KEY-----`,
    yopPublicKey: `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA6p0XWjscY+gsyqKRhw9M
TEST_PUBLIC_KEY_CONTENT
-----END PUBLIC KEY-----`,
    apiBaseUrl: 'https://openapi.yeepay.com/yop-center',
    timeout: 10000,
    ...overrides,
  };
}

/**
 * 验证数组是否唯一（无重复元素）
 *
 * @param array - 待验证的数组
 * @returns 是否唯一
 */
export function isArrayUnique<T>(array: T[]): boolean {
  return new Set(array).size === array.length;
}

/**
 * 分组数组元素
 *
 * @param array - 待分组的数组
 * @param keyFn - 分组键函数
 * @returns 分组后的 Map
 */
export function groupBy<T, K>(
  array: T[],
  keyFn: (item: T) => K,
): Map<K, T[]> {
  const groups = new Map<K, T[]>();

  array.forEach((item) => {
    const key = keyFn(item);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(item);
  });

  return groups;
}
