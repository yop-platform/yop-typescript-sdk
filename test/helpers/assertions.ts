/**
 * Custom Test Assertions
 *
 * 提供自定义断言函数，简化测试代码，提高可读性
 *
 * @example
 * ```typescript
 * import { expectValidSignature, expectApiSuccess } from './helpers/assertions';
 *
 * test('signature validation', () => {
 *   expectValidSignature('YOP-RSA2048-SHA256$abc123...');
 * });
 * ```
 */

import { expect } from '@jest/globals';
import type { YopResponse } from '../../src/types';

/**
 * 验证 YOP 签名格式是否正确
 *
 * YOP 签名格式：YOP-RSA2048-SHA256$<base64-signature>
 * - 算法前缀：YOP-RSA2048-SHA256
 * - 分隔符：$
 * - 签名内容：Base64 编码（URL Safe），不包含 +/= 字符
 *
 * @param signature - 待验证的签名字符串
 */
export function expectValidSignature(signature: string): void {
  // 验证签名格式
  expect(signature).toMatch(/^YOP-RSA2048-SHA256\$/);

  // 验证签名内容不包含 +/= 字符（应使用 URL Safe Base64）
  const signaturePart = signature.split('$')[1];
  expect(signaturePart).toBeDefined();
  expect(signaturePart).not.toMatch(/[+/=]/);

  // 验证签名长度合理（RSA 2048 签名约 342-344 字符）
  expect(signaturePart!.length).toBeGreaterThan(300);
  expect(signaturePart!.length).toBeLessThan(400);
}

/**
 * 验证 API 响应是否成功
 *
 * 成功响应应包含：
 * - state: 'SUCCESS'
 * - result.code: 'OPR00000'
 *
 * @param response - YOP API 响应对象
 */
export function expectApiSuccess(response: YopResponse): void {
  expect(response.state).toBe('SUCCESS');
  expect(response.result).toBeDefined();
  expect(response.result?.code).toBe('OPR00000');
}

/**
 * 验证 API 响应是否失败
 *
 * 失败响应应包含：
 * - state: 'FAILURE'
 * - error.code: 错误码
 * - error.message: 错误消息
 *
 * @param response - YOP API 响应对象
 * @param expectedErrorCode - 期望的错误码（可选）
 */
export function expectApiFailure(
  response: YopResponse,
  expectedErrorCode?: string,
): void {
  expect(response.state).toBe('FAILURE');
  expect(response.error).toBeDefined();
  expect(response.error?.code).toBeDefined();
  expect(response.error?.message).toBeDefined();

  if (expectedErrorCode) {
    expect(response.error?.code).toBe(expectedErrorCode);
  }
}

/**
 * 验证 URL 编码是否符合 RFC 3986 规范
 *
 * RFC 3986 未保留字符（不需要编码）：
 * - 字母：A-Z, a-z
 * - 数字：0-9
 * - 符号：- . _ ~
 *
 * 其他字符应编码为 %XX 格式
 *
 * @param encoded - 已编码的字符串
 */
export function expectRfc3986Encoding(encoded: string): void {
  // 验证所有非法字符都已编码
  const unescapedChars = /[^A-Za-z0-9\-._~%]/;
  expect(encoded).not.toMatch(unescapedChars);

  // 验证百分号编码格式正确
  const percentEncoding = /%[0-9A-F]{2}/g;
  const percentMatches = encoded.match(percentEncoding);

  if (percentMatches) {
    // 所有百分号后必须跟两个十六进制字符
    percentMatches.forEach((match) => {
      expect(match).toMatch(/^%[0-9A-F]{2}$/);
    });
  }
}

/**
 * 验证对象是否包含特定属性
 *
 * @param obj - 待验证的对象
 * @param properties - 期望包含的属性列表
 */
export function expectObjectHasProperties<T extends object>(
  obj: T,
  properties: (keyof T)[],
): void {
  properties.forEach((prop) => {
    expect(obj).toHaveProperty(prop);
    expect(obj[prop]).toBeDefined();
  });
}

/**
 * 验证数组不为空且所有元素满足条件
 *
 * @param array - 待验证的数组
 * @param predicate - 验证函数
 */
export function expectArrayAllMatch<T>(
  array: T[],
  predicate: (item: T) => boolean,
): void {
  expect(array.length).toBeGreaterThan(0);
  array.forEach((item) => {
    expect(predicate(item)).toBe(true);
  });
}

/**
 * 验证时间戳格式是否正确
 *
 * 支持的格式：
 * - ISO 8601: 2024-01-01T12:00:00+08:00
 * - Unix 毫秒时间戳: 1704081600000
 *
 * @param timestamp - 时间戳字符串或数字
 */
export function expectValidTimestamp(timestamp: string | number): void {
  if (typeof timestamp === 'string') {
    // ISO 8601 格式验证
    const iso8601Regex =
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}([+-]\d{2}:\d{2}|Z)?$/;
    expect(timestamp).toMatch(iso8601Regex);

    // 验证可以解析为有效日期
    const date = new Date(timestamp);
    expect(date.getTime()).not.toBeNaN();
  } else if (typeof timestamp === 'number') {
    // Unix 毫秒时间戳验证
    expect(timestamp).toBeGreaterThan(0);
    expect(timestamp).toBeLessThan(Date.now() + 365 * 24 * 60 * 60 * 1000); // 不超过未来一年

    const date = new Date(timestamp);
    expect(date.getTime()).toBe(timestamp);
  }
}

/**
 * 验证 HTTP 状态码是否在预期范围内
 *
 * @param statusCode - HTTP 状态码
 * @param expectedRange - 期望的状态码范围（如 '2xx', '4xx', '5xx'）
 */
export function expectHttpStatus(
  statusCode: number,
  expectedRange: '2xx' | '3xx' | '4xx' | '5xx' | number,
): void {
  if (typeof expectedRange === 'number') {
    expect(statusCode).toBe(expectedRange);
  } else {
    const rangeStart = parseInt(expectedRange[0], 10) * 100;
    const rangeEnd = rangeStart + 99;
    expect(statusCode).toBeGreaterThanOrEqual(rangeStart);
    expect(statusCode).toBeLessThanOrEqual(rangeEnd);
  }
}

/**
 * 验证异步函数抛出特定错误
 *
 * @param asyncFn - 异步函数
 * @param errorMessage - 期望的错误消息（正则或字符串）
 */
export async function expectAsyncThrow(
  asyncFn: () => Promise<unknown>,
  errorMessage: string | RegExp,
): Promise<void> {
  await expect(asyncFn()).rejects.toThrow(errorMessage);
}

/**
 * 验证对象深度相等（忽略特定字段）
 *
 * @param actual - 实际对象
 * @param expected - 期望对象
 * @param ignoreFields - 忽略的字段列表
 */
export function expectDeepEqualExcept<T extends Record<string, unknown>>(
  actual: T,
  expected: T,
  ignoreFields: string[] = [],
): void {
  const actualCopy = { ...actual };
  const expectedCopy = { ...expected };

  ignoreFields.forEach((field) => {
    delete actualCopy[field];
    delete expectedCopy[field];
  });

  expect(actualCopy).toEqual(expectedCopy);
}

/**
 * 验证字符串是否为有效的 Base64 编码
 *
 * @param str - 待验证的字符串
 * @param urlSafe - 是否为 URL Safe Base64（默认 false）
 */
export function expectValidBase64(str: string, urlSafe = false): void {
  if (urlSafe) {
    // URL Safe Base64: 使用 - 和 _ 替换 + 和 /，可能无 padding
    expect(str).toMatch(/^[A-Za-z0-9_-]*$/);
  } else {
    // 标准 Base64: 允许 +、/、= padding
    expect(str).toMatch(/^[A-Za-z0-9+/]*(={0,2})$/);
  }
}

/**
 * 验证 JSON 字符串是否有效
 *
 * @param jsonString - JSON 字符串
 */
export function expectValidJson(jsonString: string): void {
  expect(() => JSON.parse(jsonString)).not.toThrow();
  const parsed = JSON.parse(jsonString);
  expect(parsed).toBeDefined();
}

/**
 * 验证性能指标（执行时间）
 *
 * @param operation - 待测试的操作
 * @param maxDurationMs - 最大允许执行时间（毫秒）
 */
export async function expectPerformance(
  operation: () => Promise<unknown> | unknown,
  maxDurationMs: number,
): Promise<void> {
  const startTime = Date.now();

  await operation();

  const duration = Date.now() - startTime;
  expect(duration).toBeLessThanOrEqual(maxDurationMs);
}

/**
 * 验证内存使用（简单版本）
 *
 * @param operation - 待测试的操作
 * @param maxMemoryIncreaseMB - 最大允许内存增长（MB）
 */
export async function expectMemoryUsage(
  operation: () => Promise<unknown> | unknown,
  maxMemoryIncreaseMB: number,
): Promise<void> {
  // 强制垃圾回收（如果可用）
  if (global.gc) {
    global.gc();
  }

  const startMemory = process.memoryUsage().heapUsed;

  await operation();

  if (global.gc) {
    global.gc();
  }

  const endMemory = process.memoryUsage().heapUsed;
  const increaseMB = (endMemory - startMemory) / 1024 / 1024;

  expect(increaseMB).toBeLessThanOrEqual(maxMemoryIncreaseMB);
}
