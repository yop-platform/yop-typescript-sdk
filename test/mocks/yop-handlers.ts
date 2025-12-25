/**
 * YOP API Mock Handlers
 *
 * 提供 YOP API 端点的模拟响应处理器
 * 用于集成测试和单元测试中的 fetch mock
 *
 * @example
 * ```typescript
 * import { mockYopApi } from './mocks/yop-handlers';
 *
 * beforeEach(() => {
 *   global.fetch = jest.fn(mockYopApi);
 * });
 * ```
 */

import { ApiResponseFixtures } from '../fixtures/api-responses.js';
import type { YopResponse } from '../../src/types';

/**
 * API 端点路径常量
 */
export const YOP_API_ENDPOINTS = {
  PRE_PAY: '/rest/v1.0/aggpay/pre-pay',
  QUERY_ORDER: '/rest/v1.0/aggpay/query-order',
  CANCEL_ORDER: '/rest/v1.0/aggpay/cancel-order',
  REFUND: '/rest/v1.0/aggpay/refund',
  QUERY_REFUND: '/rest/v1.0/aggpay/query-refund',
} as const;

/**
 * Mock 响应配置
 */
export interface MockResponseConfig {
  status?: number;
  delay?: number;
  headers?: Record<string, string>;
  shouldFail?: boolean;
  errorCode?: string;
  customResponse?: YopResponse;
}

/**
 * 创建标准 YOP 响应
 */
function createYopResponse(
  data: YopResponse,
  config: MockResponseConfig = {},
): Response {
  const {
    status = 200,
    headers = {},
    shouldFail = false,
    errorCode = 'SYS001',
  } = config;

  const responseData = shouldFail
    ? {
        state: 'FAILURE' as const,
        error: {
          code: errorCode,
          message: '系统错误',
        },
      }
    : data;

  return new Response(JSON.stringify(responseData), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'x-yop-sign': 'mock-signature-' + Date.now(),
      ...headers,
    },
  });
}

/**
 * 解析请求 URL 和路径
 */
function parseRequestUrl(url: string): { path: string; params: URLSearchParams } {
  const urlObj = new URL(url);
  return {
    path: urlObj.pathname,
    params: urlObj.searchParams,
  };
}

/**
 * 预支付接口 Mock Handler
 */
export function handlePrePay(
  request: Request,
  config: MockResponseConfig = {},
): Response {
  const { customResponse } = config;

  if (customResponse) {
    return createYopResponse(customResponse, config);
  }

  return createYopResponse(ApiResponseFixtures.success.prePay, config);
}

/**
 * 订单查询接口 Mock Handler
 */
export function handleQueryOrder(
  request: Request,
  config: MockResponseConfig = {},
): Response {
  const { customResponse } = config;
  const { params } = parseRequestUrl(request.url);

  // 模拟订单不存在的情况
  const orderId = params.get('orderId');
  if (orderId === 'NOT_FOUND') {
    return createYopResponse(ApiResponseFixtures.businessErrors.orderNotFound, config);
  }

  if (customResponse) {
    return createYopResponse(customResponse, config);
  }

  return createYopResponse(ApiResponseFixtures.success.queryOrder, config);
}

/**
 * 订单取消接口 Mock Handler
 */
export function handleCancelOrder(
  request: Request,
  config: MockResponseConfig = {},
): Response {
  const { customResponse } = config;

  if (customResponse) {
    return createYopResponse(customResponse, config);
  }

  return createYopResponse(
    {
      state: 'SUCCESS',
      result: {
        code: 'OPR00000',
        message: '订单取消成功',
      },
    },
    config,
  );
}

/**
 * 退款接口 Mock Handler
 */
export function handleRefund(
  request: Request,
  config: MockResponseConfig = {},
): Response {
  const { customResponse } = config;

  if (customResponse) {
    return createYopResponse(customResponse, config);
  }

  return createYopResponse(ApiResponseFixtures.success.refund, config);
}

/**
 * 退款查询接口 Mock Handler
 */
export function handleQueryRefund(
  request: Request,
  config: MockResponseConfig = {},
): Response {
  const { customResponse } = config;

  if (customResponse) {
    return createYopResponse(customResponse, config);
  }

  return createYopResponse(ApiResponseFixtures.success.queryRefund, config);
}

/**
 * 通用 YOP API Mock Handler
 *
 * 根据请求 URL 自动路由到相应的处理器
 *
 * @param url - 请求 URL
 * @param options - 请求选项
 * @param mockConfig - Mock 配置
 * @returns Promise<Response>
 */
export async function mockYopApi(
  url: string | Request | URL,
  options?: RequestInit,
  mockConfig: Record<string, MockResponseConfig> = {},
): Promise<Response> {
  const request = new Request(url, options);
  const { path } = parseRequestUrl(request.url);

  // 模拟网络延迟
  const defaultDelay = mockConfig.default?.delay || 0;
  if (defaultDelay > 0) {
    await new Promise((resolve) => setTimeout(resolve, defaultDelay));
  }

  // 根据路径路由到相应的处理器
  switch (path) {
    case YOP_API_ENDPOINTS.PRE_PAY:
      return handlePrePay(request, mockConfig[path] || mockConfig.default || {});

    case YOP_API_ENDPOINTS.QUERY_ORDER:
      return handleQueryOrder(request, mockConfig[path] || mockConfig.default || {});

    case YOP_API_ENDPOINTS.CANCEL_ORDER:
      return handleCancelOrder(request, mockConfig[path] || mockConfig.default || {});

    case YOP_API_ENDPOINTS.REFUND:
      return handleRefund(request, mockConfig[path] || mockConfig.default || {});

    case YOP_API_ENDPOINTS.QUERY_REFUND:
      return handleQueryRefund(request, mockConfig[path] || mockConfig.default || {});

    default:
      // 未知端点，返回 404
      return new Response(
        JSON.stringify({
          state: 'FAILURE',
          error: {
            code: 'NOT_FOUND',
            message: `未找到接口: ${path}`,
          },
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        },
      );
  }
}

/**
 * 创建 fetch mock 函数
 *
 * @param config - Mock 配置
 * @returns jest.fn() mock
 */
export function createFetchMock(
  config: Record<string, MockResponseConfig> = {},
): jest.MockedFunction<typeof fetch> {
  return jest.fn((url, options) =>
    mockYopApi(url, options, config),
  ) as jest.MockedFunction<typeof fetch>;
}

/**
 * 预定义的 Mock 场景
 */
export const MockScenarios = {
  /**
   * 所有接口成功
   */
  allSuccess: (): jest.MockedFunction<typeof fetch> => {
    return createFetchMock({});
  },

  /**
   * 所有接口失败
   */
  allFailed: (errorCode = 'SYS001'): jest.MockedFunction<typeof fetch> => {
    return createFetchMock({
      default: { shouldFail: true, errorCode },
    });
  },

  /**
   * 网络延迟场景
   */
  withDelay: (delayMs: number): jest.MockedFunction<typeof fetch> => {
    return createFetchMock({
      default: { delay: delayMs },
    });
  },

  /**
   * 订单不存在场景
   */
  orderNotFound: (): jest.MockedFunction<typeof fetch> => {
    return createFetchMock({
      [YOP_API_ENDPOINTS.QUERY_ORDER]: {
        customResponse: ApiResponseFixtures.businessErrors.orderNotFound,
      },
    });
  },

  /**
   * 余额不足场景
   */
  insufficientBalance: (): jest.MockedFunction<typeof fetch> => {
    return createFetchMock({
      [YOP_API_ENDPOINTS.PRE_PAY]: {
        customResponse: ApiResponseFixtures.businessErrors.insufficientBalance,
      },
    });
  },

  /**
   * 签名错误场景
   */
  invalidSignature: (): jest.MockedFunction<typeof fetch> => {
    return createFetchMock({
      default: {
        customResponse: ApiResponseFixtures.systemErrors.invalidSignature,
      },
    });
  },
};
