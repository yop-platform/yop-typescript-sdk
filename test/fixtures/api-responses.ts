/**
 * API Response Fixtures
 *
 * 提供测试用的 API 响应数据，包括：
 * - 成功响应（各种业务场景）
 * - 错误响应（业务错误、系统错误）
 * - 边缘情况响应
 */

import type { YopResponse } from '../../src/types';

/**
 * 成功的预支付响应
 */
export const PRE_PAY_SUCCESS_RESPONSE: YopResponse = {
  state: 'SUCCESS',
  result: {
    code: 'OPR00000',
    message: '操作成功',
    uniqueOrderNo: 'YOP1234567890ABCDEF',
    orderAmount: '100.00',
    payUrl: 'https://cash.yeepay.com/cashier/std?token=abcd1234',
    expireTime: '2024-12-31T23:59:59+08:00',
  },
};

/**
 * 成功的订单查询响应
 */
export const QUERY_ORDER_SUCCESS_RESPONSE: YopResponse = {
  state: 'SUCCESS',
  result: {
    code: 'OPR00000',
    message: '查询成功',
    merchantNo: 'TEST_MERCHANT',
    orderId: 'ORDER123456',
    uniqueOrderNo: 'YOP1234567890ABCDEF',
    orderAmount: '100.00',
    status: 'SUCCESS',
    paySuccessDate: '2024-01-01T12:00:00+08:00',
  },
};

/**
 * 成功的退款响应
 */
export const REFUND_SUCCESS_RESPONSE: YopResponse = {
  state: 'SUCCESS',
  result: {
    code: 'OPR00000',
    message: '退款受理成功',
    refundNo: 'REFUND123456',
    uniqueRefundNo: 'YOP_REFUND_ABC',
    refundAmount: '50.00',
    status: 'PROCESSING',
  },
};

/**
 * 成功的退款查询响应
 */
export const QUERY_REFUND_SUCCESS_RESPONSE: YopResponse = {
  state: 'SUCCESS',
  result: {
    code: 'OPR00000',
    message: '查询成功',
    refundNo: 'REFUND123456',
    uniqueRefundNo: 'YOP_REFUND_ABC',
    refundAmount: '50.00',
    status: 'SUCCESS',
    refundSuccessDate: '2024-01-01T14:00:00+08:00',
  },
};

/**
 * 业务错误：余额不足
 */
export const BUSINESS_ERROR_INSUFFICIENT_BALANCE: YopResponse = {
  state: 'FAILURE',
  error: {
    code: 'BIZ001',
    message: '账户余额不足',
    subCode: 'INSUFFICIENT_BALANCE',
    subMessage: '当前可用余额: 0.00 元，需要: 100.00 元',
  },
};

/**
 * 业务错误：订单不存在
 */
export const BUSINESS_ERROR_ORDER_NOT_FOUND: YopResponse = {
  state: 'FAILURE',
  error: {
    code: 'BIZ002',
    message: '订单不存在',
    subCode: 'ORDER_NOT_FOUND',
    subMessage: '未找到订单号: ORDER123456',
  },
};

/**
 * 业务错误：订单已关闭
 */
export const BUSINESS_ERROR_ORDER_CLOSED: YopResponse = {
  state: 'FAILURE',
  error: {
    code: 'BIZ003',
    message: '订单已关闭',
    subCode: 'ORDER_CLOSED',
    subMessage: '该订单已于 2024-01-01 关闭，无法继续操作',
  },
};

/**
 * 业务错误：重复提交
 */
export const BUSINESS_ERROR_DUPLICATE_SUBMISSION: YopResponse = {
  state: 'FAILURE',
  error: {
    code: 'BIZ004',
    message: '重复提交',
    subCode: 'DUPLICATE_ORDER',
    subMessage: '订单号 ORDER123456 已存在',
  },
};

/**
 * 系统错误：签名验证失败
 */
export const SYSTEM_ERROR_INVALID_SIGNATURE: YopResponse = {
  state: 'FAILURE',
  error: {
    code: 'AUTH001',
    message: '签名验证失败',
    subCode: 'INVALID_SIGNATURE',
    subMessage: '请检查签名算法和密钥配置',
  },
};

/**
 * 系统错误：参数错误
 */
export const SYSTEM_ERROR_INVALID_PARAMS: YopResponse = {
  state: 'FAILURE',
  error: {
    code: 'PARAM001',
    message: '参数错误',
    subCode: 'MISSING_REQUIRED_PARAM',
    subMessage: '缺少必填参数: orderAmount',
  },
};

/**
 * 系统错误：服务不可用
 */
export const SYSTEM_ERROR_SERVICE_UNAVAILABLE: YopResponse = {
  state: 'FAILURE',
  error: {
    code: 'SYS001',
    message: '系统繁忙',
    subCode: 'SERVICE_UNAVAILABLE',
    subMessage: '服务暂时不可用，请稍后重试',
  },
};

/**
 * 系统错误：超时
 */
export const SYSTEM_ERROR_TIMEOUT: YopResponse = {
  state: 'FAILURE',
  error: {
    code: 'SYS002',
    message: '请求超时',
    subCode: 'REQUEST_TIMEOUT',
    subMessage: '请求处理超时，请稍后查询结果',
  },
};

/**
 * 边缘情况：空结果（仅状态码）
 */
export const EMPTY_RESULT_RESPONSE: YopResponse = {
  state: 'SUCCESS',
  result: {
    code: 'OPR00000',
  },
};

/**
 * 边缘情况：大量数据（分页结果）
 */
export const PAGINATED_RESPONSE: YopResponse = {
  state: 'SUCCESS',
  result: {
    code: 'OPR00000',
    message: '查询成功',
    totalCount: 1000,
    pageNo: 1,
    pageSize: 100,
    list: Array.from({ length: 100 }, (_, i) => ({
      orderId: `ORDER${String(i + 1).padStart(6, '0')}`,
      orderAmount: `${(i + 1) * 10}.00`,
      status: i % 3 === 0 ? 'SUCCESS' : i % 3 === 1 ? 'PROCESSING' : 'FAILED',
      createTime: `2024-01-${String((i % 28) + 1).padStart(2, '0')}T10:00:00+08:00`,
    })),
  },
};

/**
 * 边缘情况：特殊字符（中文、Emoji、特殊符号）
 */
export const SPECIAL_CHARACTERS_RESPONSE: YopResponse = {
  state: 'SUCCESS',
  result: {
    code: 'OPR00000',
    message: '测试特殊字符：中文、😀 Emoji、<>&" 符号',
    merchantName: '北京易宝支付有限公司',
    productName: '商品名称：iPhone 15 Pro Max (256GB) 📱',
    description: 'HTML字符：<script>alert("test")</script>',
    url: 'https://example.com/callback?param=value&special=<>"\' ',
  },
};

/**
 * 边缘情况：嵌套对象
 */
export const NESTED_OBJECT_RESPONSE: YopResponse = {
  state: 'SUCCESS',
  result: {
    code: 'OPR00000',
    order: {
      id: 'ORDER123',
      details: {
        products: [
          {
            id: 'PROD001',
            name: '商品1',
            price: '100.00',
            metadata: {
              tag: 'featured',
              attributes: {
                color: 'red',
                size: 'large',
              },
            },
          },
        ],
        shipping: {
          address: {
            province: '北京市',
            city: '朝阳区',
            detail: '某某街道1号',
          },
          method: 'express',
        },
      },
    },
  },
};

/**
 * 边缘情况：数组响应
 */
export const ARRAY_RESPONSE: YopResponse = {
  state: 'SUCCESS',
  result: {
    code: 'OPR00000',
    items: ['item1', 'item2', 'item3'],
    numbers: [1, 2, 3, 4, 5],
    mixed: ['string', 123, true, null, { key: 'value' }],
  },
};

/**
 * 边缘情况：null 和 undefined 值
 */
export const NULL_VALUES_RESPONSE: YopResponse = {
  state: 'SUCCESS',
  result: {
    code: 'OPR00000',
    nullField: null,
    // undefinedField 会在 JSON 序列化时被过滤
    emptyString: '',
    zeroNumber: 0,
    falseBoolean: false,
  },
};

/**
 * 所有 API 响应 fixtures 的集合
 */
export const ApiResponseFixtures = {
  success: {
    prePay: PRE_PAY_SUCCESS_RESPONSE,
    queryOrder: QUERY_ORDER_SUCCESS_RESPONSE,
    refund: REFUND_SUCCESS_RESPONSE,
    queryRefund: QUERY_REFUND_SUCCESS_RESPONSE,
  },
  businessErrors: {
    insufficientBalance: BUSINESS_ERROR_INSUFFICIENT_BALANCE,
    orderNotFound: BUSINESS_ERROR_ORDER_NOT_FOUND,
    orderClosed: BUSINESS_ERROR_ORDER_CLOSED,
    duplicateSubmission: BUSINESS_ERROR_DUPLICATE_SUBMISSION,
  },
  systemErrors: {
    invalidSignature: SYSTEM_ERROR_INVALID_SIGNATURE,
    invalidParams: SYSTEM_ERROR_INVALID_PARAMS,
    serviceUnavailable: SYSTEM_ERROR_SERVICE_UNAVAILABLE,
    timeout: SYSTEM_ERROR_TIMEOUT,
  },
  edgeCases: {
    empty: EMPTY_RESULT_RESPONSE,
    paginated: PAGINATED_RESPONSE,
    specialCharacters: SPECIAL_CHARACTERS_RESPONSE,
    nested: NESTED_OBJECT_RESPONSE,
    array: ARRAY_RESPONSE,
    nullValues: NULL_VALUES_RESPONSE,
  },
};
