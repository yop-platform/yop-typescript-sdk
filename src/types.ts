// src/types.ts
export interface YopConfig {
  appKey: string;
  secretKey: string; // 商户私钥内容 (不是路径)
  yopPublicKey?: string | Buffer; // 易宝平台公钥内容 (不是路径), 允许 Buffer
  yopApiBaseUrl?: string; // 可选，带默认值 'https://openapi.yeepay.com'
  // 根据需要添加其他配置，如果 YopClient 内部需要它们
  // parentMerchantNo?: string;
  // merchantNo?: string;
}

// 定义更具体的响应类型 (基于之前的观察)
export interface YopResult {
    code: string; // '00000' 表示成功
    message: string;
    orderId?: string;
    uniqueOrderNo?: string;
    prePayTn?: string; // 支付链接/令牌
    // ... 其他可能的 result 字段
    [key: string]: any;
}
export interface YopError {
    code: string; // 业务错误码
    message: string;
    solution?: string;
    [key: string]: any;
}
export interface YopResponseMetadata {
    yopSign?: string | null; // 来自 x-yop-sign 响应头
    yopRequestId?: string | null; // 来自 x-yop-request-id 响应头
    // 可以添加其他需要的元数据字段
    [key: string]: string | number | null | undefined;
}

export interface YopResponse {
    state: 'SUCCESS' | 'FAILURE' | string; // 包含其他可能的 state
    ts?: number;
    result?: YopResult;
    error?: YopError;
    sign?: string; // 可能在顶层 (保留以防万一)
    stringResult?: string; // 添加原始响应字符串
    metadata?: YopResponseMetadata; // 添加元数据对象
    [key: string]: any; // 允许其他字段
}
export interface YopErrorResponse extends YopResponse {
    state: 'FAILURE' | string; // 明确错误状态
    error: YopError;
}

// 从原 types.ts 迁移过来的其他可能需要的类型
export type ContentType = 'application/json' | 'application/x-www-form-urlencoded';

export interface YopRequestOptions {
  method: 'GET' | 'POST';
  apiUrl: string;
  params?: Record<string, unknown>; // Use unknown for safer type checking than any
  body?: Record<string, unknown>;   // Use unknown for safer type checking than any
  contentType?: ContentType;
  timeout?: number;
}