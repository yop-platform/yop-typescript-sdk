import { RsaV3Util } from '../src/utils/RsaV3Util';
import { HttpUtils } from '../src/utils/HttpUtils';
import crypto from 'crypto';
import { jest, describe, beforeAll, afterAll, test, expect } from '@jest/globals';

// 测试数据
const TEST_APP_KEY = 'app_10086032562';
const TEST_APP_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDdnBKx03zrrPzJ
/Z8rJMEaYvmes19qIPGcgncUQNOYauaXy99iT2P3O1H3qZceKZ8ngeha5ckuV4ke
3tLlMRHn3GvTzd1l6EEntwL6SRUopmhj/635bkGUlQvEZrWAtwfO0wcoI0XnRB3J
Lc+r8nTf64vIi2UovqcZ6LKJj96btie7rYZZqqtr2+e7S0HDqH6nHcqvBYVGYGrY
nDNKyjSvKdjGIq+JMQu1tJOtqT4JoeFAOBSTw3Jqkpvnudc1GgWVOepuGVyaXHXV
NQTjnap7LMbJ+IJXBLSgGi1uC4u8Ypc2u0kDLXKkff0X/DG9cJXMaLcf/3yBH2/U
oebTTJudAgMBAAECggEACptTfrzlW/9b2wwfT+iSsIFfurORo8n/XnMVIXxH1GH7
dvT8VF+B5J2reuvcToaF9lVeqmkYo7XvW3GlTPB4D62qYIkYKW5AHhdBlnqkf11V
nkGo0UkwbNzkYwpachZwknrhuw9TI3JMbapaZ/uzEdubhWX8mcJkS5ZqYzCmYjPz
KfYMuowZ4ygOETOER9pl8J7dt4CYYI+GLwVT39D6ptf74fzlKohT506ulLUu3AWs
avvW3QTPSxzS2ARO7QaLco8Dly8AJiGmSUdwSzzwVgYD1kVHtUUukbtnjFBTN8Pq
Gt+TM+gcv8s5LlaZSYp4Zlwt9LTdW2sFCSoRj8HLaQKBgQD3u6c2PyRckNpwGuOj
TJHy+uF7OGoiFyuGAxmyC8UzNG+nLBghZjCJmzkfzKrjNINrNT4zxepXhKurW0vx
d9ZSkjpyEteRDSfdyvsDEbfR3p6w9ObA8iZkCvesYchrwrdWO7V4sjynvEhWkLSc
tLWaASbj7zuyYu0OYiSo28MN+QKBgQDlAUB3mLEpBvWIlMnXhfz/RrmEqlg6yygu
37Xjjs7wjyPSz3RqUIB2YYT9d5wGob2nBLD4IvoSWvysNegt0TiklAHYW7LNW1DB
1Oo0M5xOgToOOA545aR8DG9XJGOlKRiGJQS0q9T4X4z1TOx93W8bzNeUZgL5Kk5W
QE8cuUxzxQKBgQC4nhgWzSeD9E9VjDRo1f9OXLj84yX1Ed9Vl6nmje8AIeuzYaD6
AvXZFtyTXitb9x6ZHqykWLIzVqO4p+kIoo4OKvtzV6deabd0CnjV6LZcqNMKfPga
glsp4yKATL7Xz9xhX032DJ43QpGGMYDn56QOiR06cGbEogSX23wGev/5wQKBgQCM
Qc8FMNzYnu2FAHP675J7mwqG6XnuUH1E8DlLrSyrg0/SjsLjVnjHiITWZQqHuUoZ
4DKvV2TIFzgIFWAlp63Ehu32YHtLcTEt9kSXQkDqiBVRnh2nCCdM3qTWv2/UOS5P
Ap82NMPUd1ky6DE0CYpCgZxLxIrvpmyiQPLzSb48bQKBgAF0EpSRsPQhPjUYsPc3
FA71R0GSRyxr9ktM5hqsG/qrh0ep4jIFKibGA+VJo/ed2QC4MNAjPR285v6ytBcF
yoEAacf7noSavVvYU5/KaQ5wJYSue0+M5IBJrrwLv0k1ppe86Xp8890NT2XHbaAL
Y3hcSBTGs2aHPUNEma7H+2T9
-----END PRIVATE KEY-----`;

// 模拟固定的时间戳和请求ID
const MOCK_TIMESTAMP = '2025-04-20T16:12:13Z';
const MOCK_FORM_REQUEST_ID = 'test-chinese-form-sdk-uuid-e1284c6e-8164-4d28-a106-12e953e094bb';
const MOCK_JSON_REQUEST_ID = 'test-chinese-json-sdk-uuid-2502546f-9033-40b5-bb5b-192a321116a4';

// 保存原始方法
const originalDate = Date;
const originalUuid = RsaV3Util.uuid;

// 测试用例1：Form数据测试
describe('Java Log Verification - Form Data', () => {
  beforeAll(() => {
    // 模拟日期
    const mockDate = new Date(MOCK_TIMESTAMP);
    // @ts-ignore 简单的模拟
    global.Date = class extends Date {
      constructor() {
        super();
        return mockDate;
      }
      static now() {
        return mockDate.getTime();
      }
    };

    // 模拟UUID
    RsaV3Util.uuid = () => MOCK_FORM_REQUEST_ID;
  });

  afterAll(() => {
    // 恢复原始方法
    global.Date = originalDate;
    RsaV3Util.uuid = originalUuid;
  });

  test('should match Java log values for Form data with Chinese characters', () => {
    // 测试数据（来自Java日志）
    const formParams = {
      item: '测试商品',
      other: '%',
      address: '北京',
      name: '李四'
    };

    // 预期值（来自Java日志）
    const expectedSortedParams = 'address=%E5%8C%97%E4%BA%AC&item=%E6%B5%8B%E8%AF%95%E5%95%86%E5%93%81&name=%E6%9D%8E%E5%9B%9B&other=%25';
    const expectedContentSha256 = 'fa4eb212f6b4ffbbfc5f6bc5b2eea33bcfdb419eeb7ce789e482ee9f66621717';
    const expectedCanonicalRequest = `yop-auth-v3/${TEST_APP_KEY}/${MOCK_TIMESTAMP}/1800
POST
/rest/v1.0/test/chinese-params-form

x-yop-appkey:${TEST_APP_KEY}
x-yop-content-sha256:${expectedContentSha256}
x-yop-request-id:${MOCK_FORM_REQUEST_ID}`;
    const expectedSignature = 'Mx4gu-hnXihOehB1vYQA-SasHBXl72Y0F43RDSQE6yQWp1-iL9l1pSZmR8BnNPjUhd77b_nsuLfR4ajZo2fmWdvACSTFX4oMNIa5yf9-OK2eIS9uqGbh-0rZFIeeyWoXy01Wx4kv7aMVvvG0Gx76fgFpqiFRc1z3kGMPLy5EPqocdpg0IMLKwDOq_qMJVfyTko1_V9E61-ENX5vQU4o0ZJgg7YDuNw0JpF1iHErl1QY8lUDXO3qZ6zgvvdq_vvAuSOhgO0wBfnIbT0IbfbsEgLvAUIaND_hiNtZJ5S4uVqxoAnC6L6o9x_DAyqAgWZgpXi-pp6PJuF4cB54eZ0UQtA$SHA256';

    // 步骤1：验证排序和URL编码的参数
    // 验证排序和URL编码的参数
    const sortedParams = RsaV3Util.getCanonicalParams(formParams);
    console.log('[FORM] Sorted & Encoded Params:', sortedParams);
    expect(sortedParams).toBe(expectedSortedParams);

    // 步骤2：验证内容SHA256
    // 验证内容SHA256
    const contentSha256 = RsaV3Util.getSha256AndHexStr(
      formParams,
      { contentType: 'application/x-www-form-urlencoded' },
      'POST'
    );
    console.log('[FORM] SHA256:', contentSha256);
    expect(contentSha256).toBe(expectedContentSha256);

    // 步骤3：验证规范请求
    // 验证规范请求
    // 构建规范请求
    const headersToSign = {
      'x-yop-appkey': TEST_APP_KEY,
      'x-yop-content-sha256': contentSha256,
      'x-yop-request-id': MOCK_FORM_REQUEST_ID,
    };
    const { canonicalHeaderString } = RsaV3Util.buildCanonicalHeaders(headersToSign);
    const authString = `yop-auth-v3/${TEST_APP_KEY}/${MOCK_TIMESTAMP}/1800`;
    const canonicalRequest = [
      authString,
      'POST',
      '/rest/v1.0/test/chinese-params-form',
      '',
      canonicalHeaderString
    ].join('\n');
    
    console.log('[FORM] Canonical Request:', canonicalRequest);
    expect(canonicalRequest).toBe(expectedCanonicalRequest);

    // 步骤4：验证签名
    // 验证签名
    const signature = RsaV3Util.sign(canonicalRequest, TEST_APP_PRIVATE_KEY);
    console.log('[FORM] Signature:', signature);
    expect(signature).toBe(expectedSignature);
  });
});

// 测试用例2：JSON数据测试
describe('Java Log Verification - JSON Data', () => {
  beforeAll(() => {
    // 模拟日期
    const mockDate = new Date(MOCK_TIMESTAMP);
    // @ts-ignore 简单的模拟
    global.Date = class extends Date {
      constructor() {
        super();
        return mockDate;
      }
      static now() {
        return mockDate.getTime();
      }
    };

    // 模拟UUID
    RsaV3Util.uuid = () => MOCK_JSON_REQUEST_ID;
  });

  afterAll(() => {
    // 恢复原始方法
    global.Date = originalDate;
    RsaV3Util.uuid = originalUuid;
  });

  test('should match Java log values for JSON data with Chinese characters', () => {
    // 测试数据（来自Java日志）
    const jsonParams = {
      city: '上海',
      name: '张三',
      other: '%'
    };

    // 预期值（来自Java日志）
    const expectedContentSha256 = '0b3b5ff3c6a9716b3d722606e2e4645c722dc292c5cc0e38ece400f15a59481f';
    const expectedCanonicalRequest = `yop-auth-v3/${TEST_APP_KEY}/${MOCK_TIMESTAMP}/1800
POST
/rest/v1.0/aggpay/pre-pay

x-yop-appkey:${TEST_APP_KEY}
x-yop-content-sha256:${expectedContentSha256}
x-yop-request-id:${MOCK_JSON_REQUEST_ID}`;
    const expectedSignature = 'FLxV1ybsyb70f-GZMJX89G1MMn2MIIAnuelxohTUUSPZRtvo1EhkMY6EPJSE7xWFPihni3QCXEiDENJiAaQm7J_9AulzWHI0CnHq-mIWq67mcNpx-0nBKq4BpybZ1Fivsshoersy1Img3Fla5xQTyf7wDwWRZ2QDCr6QvluVA6gT0Aje-VYz1Jtv3S-33HtR91JiioRVt65MnnDAg4sGnd_EH57lp9939EhNWT03NgvdovcRrYLcATc9y3VPntNzsVXHVMgkpryURpn9IZ9tiG9ZDI_1JgHIrO0IkvQnWzYlMM_KO6SKgJQbGHSGfzDwi4QV8ydA4IUk1rLGEtqC4w$SHA256';

    // 步骤1：验证内容SHA256
    // 验证内容SHA256
    const contentSha256 = RsaV3Util.getSha256AndHexStr(
      jsonParams,
      { contentType: 'application/json' },
      'POST'
    );
    console.log('[JSON] SHA256:', contentSha256);
    expect(contentSha256).toBe(expectedContentSha256);

    // 步骤2：验证规范请求
    // 验证规范请求
    // 构建规范请求
    const headersToSign = {
      'x-yop-appkey': TEST_APP_KEY,
      'x-yop-content-sha256': contentSha256,
      'x-yop-request-id': MOCK_JSON_REQUEST_ID,
    };
    const { canonicalHeaderString } = RsaV3Util.buildCanonicalHeaders(headersToSign);
    const authString = `yop-auth-v3/${TEST_APP_KEY}/${MOCK_TIMESTAMP}/1800`;
    const canonicalRequest = [
      authString,
      'POST',
      '/rest/v1.0/aggpay/pre-pay',
      '',
      canonicalHeaderString
    ].join('\n');
    
    console.log('[JSON] Canonical Request:', canonicalRequest);
    expect(canonicalRequest).toBe(expectedCanonicalRequest);

    // 步骤3：验证签名
    // 验证签名
    const signature = RsaV3Util.sign(canonicalRequest, TEST_APP_PRIVATE_KEY);
    console.log('[JSON] Signature:', signature);
    expect(signature).toBe(expectedSignature);
  });
});