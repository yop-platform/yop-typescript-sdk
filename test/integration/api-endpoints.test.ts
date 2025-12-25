/**
 * YOP API 端点集成测试
 *
 * 测试核心 API 端点的完整请求流程，包括：
 * 1. 预支付接口（pre-pay）
 * 2. 订单查询接口（query-order）
 * 3. 订单取消接口（cancel-order）
 * 4. 退款接口（refund）
 * 5. 退款查询接口（query-refund）
 *
 * 这些测试使用 Mock 响应，验证端到端的请求构建、签名、发送和响应解析流程。
 */

import { describe, beforeEach, afterEach, test, expect, jest } from '@jest/globals';
import { YopClient } from '../../src/YopClient';
import { YopConfig } from '../../src/types';
import { RsaV3Util } from '../../src/utils/RsaV3Util';
import { VerifyUtils } from '../../src/utils/VerifyUtils';
import { ApiResponseFixtures, CryptoFixtures } from '../fixtures/index.js';
import {
  expectApiSuccess,
  createMockSuccessResponse,
  createMockErrorResponse,
} from '../helpers/index.js';

describe('YOP API 端点集成测试', () => {
  let yopClient: YopClient;
  let mockConfig: YopConfig;
  let mockFetch: jest.MockedFunction<typeof fetch>;
  let mockGetAuthHeaders: jest.MockedFunction<typeof RsaV3Util.getAuthHeaders>;
  let mockIsValidRsaResult: jest.MockedFunction<typeof VerifyUtils.isValidRsaResult>;

  beforeEach(() => {
    // Mock 配置
    mockConfig = {
      appKey: 'TEST_APP_KEY',
      secretKey: CryptoFixtures.rsa.privateKey.pkcs8,
      yopPublicKey: CryptoFixtures.rsa.publicKey.pem,
      yopApiBaseUrl: 'https://openapi.yeepay.com/yop-center',
    };

    // Mock fetch
    mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
    global.fetch = mockFetch;

    // Mock RsaV3Util.getAuthHeaders
    mockGetAuthHeaders = jest.fn().mockReturnValue({
      'x-yop-request-id': 'test-request-id',
      'x-yop-date': '2024-01-01T00:00:00Z',
      Authorization: 'YOP-RSA2048-SHA256$mock-signature',
    }) as jest.MockedFunction<typeof RsaV3Util.getAuthHeaders>;
    (RsaV3Util as any).getAuthHeaders = mockGetAuthHeaders;

    // Mock VerifyUtils.isValidRsaResult - 绕过签名验证
    mockIsValidRsaResult = jest.fn().mockReturnValue(true) as jest.MockedFunction<
      typeof VerifyUtils.isValidRsaResult
    >;
    (VerifyUtils as any).isValidRsaResult = mockIsValidRsaResult;

    yopClient = new YopClient(mockConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('[P0] 预支付接口 (/rest/v1.0/aggpay/pre-pay)', () => {
    const endpoint = '/rest/v1.0/aggpay/pre-pay';

    test('[P0] 应成功创建预支付订单', async () => {
      mockFetch.mockResolvedValue(
        createMockSuccessResponse(ApiResponseFixtures.success.prePay.result!),
      );

      const params = {
        parentMerchantNo: 'TEST_MERCHANT',
        merchantNo: 'SUB_MERCHANT',
        orderId: 'ORDER123456',
        orderAmount: '100.00',
        goodsName: '测试商品',
        notifyUrl: 'https://example.com/notify',
      };

      const result = await yopClient.post(endpoint, params);

      // 验证请求
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url.toString()).toContain(endpoint);
      expect(options?.method).toBe('POST');

      // 验证响应
      expectApiSuccess(result);
      expect(result.result?.uniqueOrderNo).toBe('YOP1234567890ABCDEF');
      expect(result.result?.orderAmount).toBe('100.00');
      expect(result.result?.payUrl).toBeDefined();
    });

    test('[P1] 应处理余额不足错误', async () => {
      mockFetch.mockResolvedValue(
        createMockErrorResponse('BIZ001', '账户余额不足'),
      );

      const params = {
        parentMerchantNo: 'TEST_MERCHANT',
        merchantNo: 'SUB_MERCHANT',
        orderId: 'ORDER123456',
        orderAmount: '100.00',
        goodsName: '测试商品',
      };

      await expect(yopClient.post(endpoint, params)).rejects.toThrow(/BIZ001.*余额不足/);
    });

    test('[P1] 应处理重复订单错误', async () => {
      mockFetch.mockResolvedValue(
        createMockErrorResponse('BIZ004', '重复提交'),
      );

      const params = {
        parentMerchantNo: 'TEST_MERCHANT',
        merchantNo: 'SUB_MERCHANT',
        orderId: 'DUPLICATE_ORDER',
        orderAmount: '100.00',
        goodsName: '测试商品',
      };

      await expect(yopClient.post(endpoint, params)).rejects.toThrow(/BIZ004.*重复提交/);
    });

    test('[P2] 应正确处理特殊字符', async () => {
      mockFetch.mockResolvedValue(
        createMockSuccessResponse(ApiResponseFixtures.success.prePay.result!),
      );

      const params = {
        parentMerchantNo: 'TEST_MERCHANT',
        merchantNo: 'SUB_MERCHANT',
        orderId: 'ORDER123456',
        orderAmount: '100.00',
        goodsName: '测试商品：iPhone 15 Pro <>&" 😀',
        remark: '备注信息\n包含换行符',
      };

      const result = await yopClient.post(endpoint, params);

      expect(mockFetch).toHaveBeenCalled();
      expectApiSuccess(result);
    });
  });

  describe('[P0] 订单查询接口 (/rest/v1.0/aggpay/query-order)', () => {
    const endpoint = '/rest/v1.0/aggpay/query-order';

    test('[P0] 应成功查询订单信息', async () => {
      mockFetch.mockResolvedValue(
        createMockSuccessResponse(ApiResponseFixtures.success.queryOrder.result!),
      );

      const params = {
        parentMerchantNo: 'TEST_MERCHANT',
        merchantNo: 'SUB_MERCHANT',
        orderId: 'ORDER123456',
      };

      const result = await yopClient.get(endpoint, params);

      // 验证请求
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url.toString()).toContain(endpoint);
      expect(url.toString()).toContain('orderId=ORDER123456');
      expect(options?.method).toBe('GET');

      // 验证响应
      expectApiSuccess(result);
      expect(result.result?.orderId).toBe('ORDER123456');
      expect(result.result?.status).toBeDefined();
    });

    test('[P1] 应处理订单不存在错误', async () => {
      mockFetch.mockResolvedValue(
        createMockErrorResponse('BIZ002', '订单不存在'),
      );

      const params = {
        parentMerchantNo: 'TEST_MERCHANT',
        merchantNo: 'SUB_MERCHANT',
        orderId: 'NOT_FOUND_ORDER',
      };

      await expect(yopClient.get(endpoint, params)).rejects.toThrow(/BIZ002.*订单不存在/);
    });

    test('[P2] 应支持使用 uniqueOrderNo 查询', async () => {
      mockFetch.mockResolvedValue(
        createMockSuccessResponse(ApiResponseFixtures.success.queryOrder.result!),
      );

      const params = {
        parentMerchantNo: 'TEST_MERCHANT',
        merchantNo: 'SUB_MERCHANT',
        uniqueOrderNo: 'YOP1234567890ABCDEF',
      };

      const result = await yopClient.get(endpoint, params);

      expect(mockFetch).toHaveBeenCalled();
      const [url] = mockFetch.mock.calls[0];
      expect(url.toString()).toContain('uniqueOrderNo=YOP1234567890ABCDEF');
      expectApiSuccess(result);
    });
  });

  describe('[P0] 订单取消接口 (/rest/v1.0/aggpay/cancel-order)', () => {
    const endpoint = '/rest/v1.0/aggpay/cancel-order';

    test('[P0] 应成功取消订单', async () => {
      mockFetch.mockResolvedValue(
        createMockSuccessResponse({
          code: 'OPR00000',
          message: '订单取消成功',
        }),
      );

      const params = {
        parentMerchantNo: 'TEST_MERCHANT',
        merchantNo: 'SUB_MERCHANT',
        orderId: 'ORDER123456',
      };

      const result = await yopClient.post(endpoint, params);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expectApiSuccess(result);
      expect(result.result?.message).toContain('成功');
    });

    test('[P1] 应处理订单已关闭错误', async () => {
      mockFetch.mockResolvedValue(
        createMockErrorResponse('BIZ003', '订单已关闭'),
      );

      const params = {
        parentMerchantNo: 'TEST_MERCHANT',
        merchantNo: 'SUB_MERCHANT',
        orderId: 'CLOSED_ORDER',
      };

      await expect(yopClient.post(endpoint, params)).rejects.toThrow(/BIZ003/);
    });

    test('[P2] 应处理订单状态不允许取消', async () => {
      mockFetch.mockResolvedValue(
        createMockErrorResponse('BIZ005', '订单状态不允许取消'),
      );

      const params = {
        parentMerchantNo: 'TEST_MERCHANT',
        merchantNo: 'SUB_MERCHANT',
        orderId: 'PAID_ORDER',
      };

      await expect(yopClient.post(endpoint, params)).rejects.toThrow(/BIZ005/);
    });
  });

  describe('[P0] 退款接口 (/rest/v1.0/aggpay/refund)', () => {
    const endpoint = '/rest/v1.0/aggpay/refund';

    test('[P0] 应成功提交退款申请', async () => {
      mockFetch.mockResolvedValue(
        createMockSuccessResponse(ApiResponseFixtures.success.refund.result!),
      );

      const params = {
        parentMerchantNo: 'TEST_MERCHANT',
        merchantNo: 'SUB_MERCHANT',
        orderId: 'ORDER123456',
        refundRequestId: 'REFUND123456',
        refundAmount: '50.00',
        description: '商品退款',
      };

      const result = await yopClient.post(endpoint, params);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expectApiSuccess(result);
      expect(result.result?.refundNo).toBe('REFUND123456');
      expect(result.result?.refundAmount).toBe('50.00');
      expect(result.result?.status).toBe('PROCESSING');
    });

    test('[P1] 应处理退款金额超限错误', async () => {
      mockFetch.mockResolvedValue(
        createMockErrorResponse('BIZ006', '退款金额超过订单金额'),
      );

      const params = {
        parentMerchantNo: 'TEST_MERCHANT',
        merchantNo: 'SUB_MERCHANT',
        orderId: 'ORDER123456',
        refundRequestId: 'REFUND123456',
        refundAmount: '200.00',
        description: '商品退款',
      };

      await expect(yopClient.post(endpoint, params)).rejects.toThrow(/BIZ006/);
    });

    test('[P2] 应支持部分退款', async () => {
      mockFetch.mockResolvedValue(
        createMockSuccessResponse({
          code: 'OPR00000',
          refundNo: 'REFUND_PARTIAL',
          refundAmount: '30.00',
          status: 'PROCESSING',
        }),
      );

      const params = {
        parentMerchantNo: 'TEST_MERCHANT',
        merchantNo: 'SUB_MERCHANT',
        orderId: 'ORDER123456',
        refundRequestId: 'REFUND_PARTIAL',
        refundAmount: '30.00',
        description: '部分退款',
      };

      const result = await yopClient.post(endpoint, params);

      expectApiSuccess(result);
      expect(result.result?.refundAmount).toBe('30.00');
    });
  });

  describe('[P0] 退款查询接口 (/rest/v1.0/aggpay/query-refund)', () => {
    const endpoint = '/rest/v1.0/aggpay/query-refund';

    test('[P0] 应成功查询退款状态', async () => {
      mockFetch.mockResolvedValue(
        createMockSuccessResponse(ApiResponseFixtures.success.queryRefund.result!),
      );

      const params = {
        parentMerchantNo: 'TEST_MERCHANT',
        merchantNo: 'SUB_MERCHANT',
        refundRequestId: 'REFUND123456',
      };

      const result = await yopClient.get(endpoint, params);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url] = mockFetch.mock.calls[0];
      expect(url.toString()).toContain('refundRequestId=REFUND123456');

      expectApiSuccess(result);
      expect(result.result?.refundNo).toBe('REFUND123456');
      expect(result.result?.status).toBe('SUCCESS');
      expect(result.result?.refundSuccessDate).toBeDefined();
    });

    test('[P1] 应处理退款单不存在错误', async () => {
      mockFetch.mockResolvedValue(
        createMockErrorResponse('BIZ007', '退款单不存在'),
      );

      const params = {
        parentMerchantNo: 'TEST_MERCHANT',
        merchantNo: 'SUB_MERCHANT',
        refundRequestId: 'NOT_FOUND_REFUND',
      };

      await expect(yopClient.get(endpoint, params)).rejects.toThrow(/BIZ007/);
    });

    test('[P2] 应支持查询退款处理中状态', async () => {
      mockFetch.mockResolvedValue(
        createMockSuccessResponse({
          code: 'OPR00000',
          refundNo: 'REFUND123456',
          status: 'PROCESSING',
          refundAmount: '50.00',
        }),
      );

      const params = {
        parentMerchantNo: 'TEST_MERCHANT',
        merchantNo: 'SUB_MERCHANT',
        refundRequestId: 'REFUND123456',
      };

      const result = await yopClient.get(endpoint, params);

      expectApiSuccess(result);
      expect(result.result?.status).toBe('PROCESSING');
    });

    test('[P2] 应支持查询退款失败状态', async () => {
      mockFetch.mockResolvedValue(
        createMockSuccessResponse({
          code: 'OPR00000',
          refundNo: 'REFUND123456',
          status: 'FAILED',
          refundAmount: '50.00',
          failReason: '账户异常',
        }),
      );

      const params = {
        parentMerchantNo: 'TEST_MERCHANT',
        merchantNo: 'SUB_MERCHANT',
        refundRequestId: 'REFUND123456',
      };

      const result = await yopClient.get(endpoint, params);

      expectApiSuccess(result);
      expect(result.result?.status).toBe('FAILED');
      expect(result.result?.failReason).toBeDefined();
    });
  });

  describe('[P1] 系统错误处理', () => {
    test('[P1] 应处理签名验证失败', async () => {
      mockFetch.mockResolvedValue(
        createMockErrorResponse('AUTH001', '签名验证失败'),
      );

      await expect(
        yopClient.post('/rest/v1.0/aggpay/pre-pay', {
          parentMerchantNo: 'TEST_MERCHANT',
          orderId: 'ORDER123',
          orderAmount: '100.00',
        }),
      ).rejects.toThrow(/AUTH001/);
    });

    test('[P1] 应处理参数错误', async () => {
      mockFetch.mockResolvedValue(
        createMockErrorResponse('PARAM001', '参数错误'),
      );

      await expect(
        yopClient.post('/rest/v1.0/aggpay/pre-pay', {
          // 缺少必填参数
          parentMerchantNo: 'TEST_MERCHANT',
        }),
      ).rejects.toThrow(/PARAM001/);
    });

    test('[P1] 应处理服务不可用', async () => {
      mockFetch.mockResolvedValue(
        createMockErrorResponse('SYS001', '系统繁忙'),
      );

      await expect(
        yopClient.get('/rest/v1.0/aggpay/query-order', {
          parentMerchantNo: 'TEST_MERCHANT',
          orderId: 'ORDER123',
        }),
      ).rejects.toThrow(/SYS001/);
    });

    test('[P1] 应处理请求超时', async () => {
      mockFetch.mockResolvedValue(
        createMockErrorResponse('SYS002', '请求超时'),
      );

      await expect(
        yopClient.post('/rest/v1.0/aggpay/pre-pay', {
          parentMerchantNo: 'TEST_MERCHANT',
          orderId: 'ORDER123',
          orderAmount: '100.00',
        }),
      ).rejects.toThrow(/SYS002/);
    });
  });

  describe('[P2] 跨端点集成场景', () => {
    test('[P2] 应支持完整的支付流程：预支付 → 查询订单', async () => {
      // 步骤1: 预支付
      mockFetch.mockResolvedValueOnce(
        createMockSuccessResponse(ApiResponseFixtures.success.prePay.result!),
      );

      const prePayResult = await yopClient.post('/rest/v1.0/aggpay/pre-pay', {
        parentMerchantNo: 'TEST_MERCHANT',
        merchantNo: 'SUB_MERCHANT',
        orderId: 'ORDER123456',
        orderAmount: '100.00',
        goodsName: '测试商品',
      });

      expectApiSuccess(prePayResult);
      const uniqueOrderNo = prePayResult.result?.uniqueOrderNo;

      // 步骤2: 查询订单
      mockFetch.mockResolvedValueOnce(
        createMockSuccessResponse({
          code: 'OPR00000',
          orderId: 'ORDER123456',
          uniqueOrderNo: uniqueOrderNo,
          status: 'SUCCESS',
          orderAmount: '100.00',
        }),
      );

      const queryResult = await yopClient.get('/rest/v1.0/aggpay/query-order', {
        parentMerchantNo: 'TEST_MERCHANT',
        merchantNo: 'SUB_MERCHANT',
        uniqueOrderNo: uniqueOrderNo,
      });

      expectApiSuccess(queryResult);
      expect(queryResult.result?.status).toBe('SUCCESS');
    });

    test('[P2] 应支持完整的退款流程：退款 → 查询退款', async () => {
      // 步骤1: 提交退款
      mockFetch.mockResolvedValueOnce(
        createMockSuccessResponse(ApiResponseFixtures.success.refund.result!),
      );

      const refundResult = await yopClient.post('/rest/v1.0/aggpay/refund', {
        parentMerchantNo: 'TEST_MERCHANT',
        merchantNo: 'SUB_MERCHANT',
        orderId: 'ORDER123456',
        refundRequestId: 'REFUND123456',
        refundAmount: '50.00',
      });

      expectApiSuccess(refundResult);

      // 步骤2: 查询退款
      mockFetch.mockResolvedValueOnce(
        createMockSuccessResponse({
          code: 'OPR00000',
          refundNo: 'REFUND123456',
          refundAmount: '50.00',
          status: 'SUCCESS',
        }),
      );

      const queryRefundResult = await yopClient.get(
        '/rest/v1.0/aggpay/query-refund',
        {
          parentMerchantNo: 'TEST_MERCHANT',
          merchantNo: 'SUB_MERCHANT',
          refundRequestId: 'REFUND123456',
        },
      );

      expectApiSuccess(queryRefundResult);
      expect(queryRefundResult.result?.status).toBe('SUCCESS');
    });
  });
});
