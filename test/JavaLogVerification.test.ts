import { RsaV3Util } from '../src/utils/RsaV3Util';
import { HttpUtils } from '../src/utils/HttpUtils';
import crypto from 'crypto';
import { jest, describe, beforeAll, afterAll, test, expect } from '@jest/globals';
import { YopClient } from '../src/YopClient'; // Import YopClient
import { VerifyUtils } from '../src/utils/VerifyUtils'; // Import VerifyUtils
import fs from 'fs'; // Import fs for reading public key
import path from 'path'; // Import path for resolving file path
import { fileURLToPath } from 'url'; // Import fileURLToPath for ESM __dirname equivalent
// import fetch, { Headers } from 'node-fetch'; // 不再需要 node-fetch

// 测试数据 (保留常量)
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

// 保存原始方法 (保留，以防万一其他测试需要)
const originalDate = Date;
const originalUuid = RsaV3Util.uuid;

// 测试用例4：用户提供的 Aggpay Pre-pay Log 验证
describe('Java Log Verification - User Provided Aggpay Log', () => {
  // 模拟固定的时间戳和请求ID (来自用户提供的日志)
  const MOCK_USER_LOG_TIMESTAMP = '2025-04-21T02:51:38Z';
  const MOCK_USER_LOG_REQUEST_ID = '0aa2f586-9362-473a-bd79-1f815f80caf4';

  beforeAll(() => {
    // 模拟日期
    const mockDate = new Date(MOCK_USER_LOG_TIMESTAMP);
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
    RsaV3Util.uuid = () => MOCK_USER_LOG_REQUEST_ID;
  });

  afterAll(() => {
    // 恢复原始方法
    global.Date = originalDate;
    RsaV3Util.uuid = originalUuid;
  });

  test('should match user provided Java log values and verify response signature', async () => { // Make test async
    // ESM equivalent for __dirname
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    // 读取易宝平台公钥
    const yopPublicKeyPath = path.resolve(__dirname, '../src/assets/yop_platform_rsa_cert_rsa.pem');
    const yopPublicKey = fs.readFileSync(yopPublicKeyPath, 'utf-8');

    // 测试数据（来自用户提供的日志）
    const formParams = {
      orderId: 'pPKiKylW6HsjTahIUC20',
      channel: 'WECHAT',
      payWay: 'USER_SCAN',
      scene: 'ONLINE',
      orderAmount: '1.00',
      notifyUrl: 'http://example.com/notify',
      userIp: '1',
      parentMerchantNo: '10086032562',
      goodsName: 'apple%pen',
      merchantNo: '10086039518'
    };

    // 预期值（来自用户提供的日志）
    const expectedContentSha256 = '2e629e7906637d262a3b1539386894684fdd3711c3b0051133d69d2cc8ad8fef';
    const expectedCanonicalHeadersString = 'content-type:application%2Fx-www-form-urlencoded\nx-yop-appkey:app_10086032562\nx-yop-content-sha256:2e629e7906637d262a3b1539386894684fdd3711c3b0051133d69d2cc8ad8fef\nx-yop-request-id:0aa2f586-9362-473a-bd79-1f815f80caf4';
    const expectedCanonicalRequest = `yop-auth-v3/${TEST_APP_KEY}/${MOCK_USER_LOG_TIMESTAMP}/1800
POST
/rest/v1.0/aggpay/pre-pay

${expectedCanonicalHeadersString}`;
    const expectedSignature = 'Q45vMDKmdLOwXe3vuwMQw8f_70CmxA89ipQqc3tcvRhKqwnlJ_1cmGC-_WebBOyObCHYNaydq9EoCp9VIPR_gaMwY0Nhk_Oo4dehiDZl7lJxMnV2poetz7D3ag_qCHoYGEFMA6fbhb8jxuYsOaPaa3u7IcUpKQ0UtTKR__o0QGm6idjnKywEtfVzQD5G_HPjIKcmQ_q2cVFWG2XSdtBmI0kEU7GVPsA94v8uZe8bUIcjuZdKIFPj6KfSnAXaZu-fzpEIZ0vcFwUtacGAU0NT7CEb3ZQREFQdxbO-T-Hz1iHWAJFr9O0qjNp7lHVnAx_RQiYX7mM36gbkYy1rB2zF1Q$SHA256';
    const expectedAuthorizationHeader = `YOP-RSA2048-SHA256 yop-auth-v3/${TEST_APP_KEY}/${MOCK_USER_LOG_TIMESTAMP}/1800/content-type;x-yop-appkey;x-yop-content-sha256;x-yop-request-id/${expectedSignature}`;

    // --- 执行计算和验证 (本地) ---

    // 步骤1：计算内容SHA256
    const contentSha256 = RsaV3Util.getSha256AndHexStr(
      formParams,
      { contentType: 'application/x-www-form-urlencoded' },
      'POST'
    );
    console.log('[USER LOG] Calculated SHA256:', contentSha256);
    expect(contentSha256).toBe(expectedContentSha256);

    // 步骤2：计算规范请求
    const headersToSign = {
      'content-type': 'application/x-www-form-urlencoded',
      'x-yop-appkey': TEST_APP_KEY,
      'x-yop-content-sha256': contentSha256,
      'x-yop-request-id': MOCK_USER_LOG_REQUEST_ID,
    };

    // 使用 RsaV3Util.buildCanonicalHeaders (已修复)
    const { canonicalHeaderString, signedHeadersString } = RsaV3Util.buildCanonicalHeaders(headersToSign);
    console.log('[USER LOG] Calculated Canonical Headers String:', canonicalHeaderString);
    expect(canonicalHeaderString).toBe(expectedCanonicalHeadersString);

    const authString = `yop-auth-v3/${TEST_APP_KEY}/${MOCK_USER_LOG_TIMESTAMP}/1800`;
    const canonicalRequest = [
      authString,
      'POST',
      '/rest/v1.0/aggpay/pre-pay',
      '',
      canonicalHeaderString
    ].join('\n');
    console.log('[USER LOG] Calculated Canonical Request:\n', canonicalRequest);
    expect(canonicalRequest).toBe(expectedCanonicalRequest);

    // 步骤3：计算签名
    const signature = RsaV3Util.sign(canonicalRequest, TEST_APP_PRIVATE_KEY);
    console.log('[USER LOG] Calculated Signature:', signature);
    expect(signature).toBe(expectedSignature);

    // 步骤4：构建 Authorization Header
    // 使用 RsaV3Util.buildCanonicalHeaders 返回的 signedHeadersString
    const authorizationHeader = `YOP-RSA2048-SHA256 ${authString}/${signedHeadersString}/${signature}`;
    console.log('[USER LOG] Calculated Authorization Header:', authorizationHeader);
    expect(authorizationHeader).toBe(expectedAuthorizationHeader);

    // --- 步骤5：实际发起API请求并验证响应签名 (使用 YopClient) ---
    console.log('\n[USER LOG] Initiating actual API request using YopClient...');

    const yopClient = new YopClient({
      appKey: TEST_APP_KEY,
      secretKey: TEST_APP_PRIVATE_KEY,
      yopApiBaseUrl: 'https://openapi.yeepay.com', // 基础 URL
      yopPublicKey: yopPublicKey, // Pass the loaded key/cert content
    });

    try {
      // 使用 YopClient.request 发起请求
      const response = await yopClient.request({
        method: 'POST',
        apiUrl: '/rest/v1.0/aggpay/pre-pay', // API 路径
        body: formParams, // 使用 body 传递参数
        // contentType 默认为 'application/x-www-form-urlencoded'
      });

      console.log('[USER LOG] API Response Status:', response.state);
      console.log('[USER LOG] API Response String Result:', response.stringResult);
      console.log('[USER LOG] API Response Metadata (contains x-yop-sign):', response.metadata);

      // 验证请求是否成功
      expect(response.state).toBe('SUCCESS');
      // expect(response.result?.code).toBe('00000'); // 可选：检查业务代码

      // 响应签名验证已在 YopClient.request 内部完成。
      // 如果签名无效，YopClient.request 会抛出错误，测试会在此处失败。
      // 因此，如果代码执行到这里，意味着请求成功且验签（如果存在签名）通过。
      console.log('[USER LOG] Reached end of try block, implying request success and signature verification passed (if signature was present).');

    } catch (error) {
      console.error('[USER LOG] API Request or Verification failed:', error);
      expect(error).toBeNull(); // Force test failure if catch block is reached
    }
  });
});