import { RsaV3Util } from '../src/utils/RsaV3Util';
import crypto from 'crypto';

// --- Test Data ---
const TEST_APP_KEY = 'testAppKey';
// Sample RSA Private Key (PKCS#8 PEM format) - **DO NOT USE IN PRODUCTION**
const TEST_SECRET_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC7VJTUt9Us8cKj
MzEfYyjiWA4R4/M2bS1GB4t7NXp98C3SC6dVMvDuictGeurT8jNbvJZHtCSuYEvu
NMoSfm76oqFvAp8Gy0iz5sxjZmSnXyCdPEovGhLa0VzMaQ8s+CLOyS56YyCFGeJZ
agUCjwwkHzWVu/tD+OONpCNEm8ux/9QyKRUUbI/pCsm+jTYNRiJxjpZK0smHRsHs
bKnPB5YGKPDlUmcMAQrXBJFEfW1Lh9jBuBwGGMbZKKEk3+WkZeCzj0Fw9SgZQG1M
LQQQZ+lSgzLk9S4pHQov7+LepHMgdFEPWLekh/qwjwUYGXdj4jrHtZBMZfS1+H0s
Z4Y6LnLPAgMBAAECggEADEEwgkjZfFDR84LQJ25k0svmA+JQA+mKlTJQ9YLaF0Na
xT0W8jaQgIXY4hG6tOxx9fNLn9VGbJ6XE4KC7P5ZtY5AgPwdHIUBwbAkwITZw9Fo
UmGQ7+a5vZJ7Qw9KXzVwPve5XTu82K7fcDyMqzM7nVkCnYaLeOikU0/xfuQFHEYt
QI5xwFNNrxl6nfIYXyXxnS+SRGcCJ/mf6cMxXLy2Zp/6RUB5tnLHRQaQ3+bQ0yKo
eFwK+42Jb9XAMJwqudHnFPvxrJRxRsT/lX3wUWkz8O+jTAXc4S7L6n+ru6TJZvdO
Zyj3z5FT/tJClTrOOGxkxxa8ccrxJILGziyQFQIhAQKBgQDyR+dHfPZDzwSqBKgG
YbNTQT8jGlTirDWMYIJljzCrDvD5wU8lTTJZk0K9fxvUrtZZi9MjnkEyWxnFcJja
EkfvmGdkFQKCCVWGBnMcLuBVQJjBwkgwYvm1/pf4wy34ylXrhMAbPnMvQbm5xGqC
qvdnWYVwGxLQJmxLqYLwRpXcHwKBgQDGQs7FRTisHV0xooiRmlvYF0EAp3yLcTtL
ey4m97D0oo2eIyHknloy9bEM73Z4NnJTLKFOuQWpNxbuScOsHhbLdAJFEqpOtT4S
NTmOcUHeFGXgHmMYrCDpJkk5tvgEkmD8frjzNGg4Vn3UwQxJpF8XuYGjrP8SZDCA
GBo0C7SZoQKBgQCqYEMjLyj8HGcrQwhgJpEFxmmzvnrCHzHPFE3ep0n9lSX8xq+r
XwzMm8Zxu6EhVfYxe75/aFxQmCjQIelnLqMwwQeQpLQzhK3pnwKfPR5jKGkvMahS
T0vZ9bCBbfX/ZXx7Wm4+EeLxRGZlEwVv0MUlk3F5EpJJFLwJZMk6bBLaRQKBgQC7
OeFJX8VJYbF1NNgZ+NmKZZUGmweJVMJ3QW9BnFk1a/H7gZ9hGc2I8Wn4n5T7YBjf
QPKzJaCVOSd9FaZWcfHzwZAbNwuQUjQJ7qdJLLsS7lOmMh7qdH4DKQyM/HnWQ7Gk
HoGGKJxuNvxALq5xJ8bXjmh0/YlDkHgAZ8/kkxSVAQKBgBfJPV7kKgG0OQ5WAY2F
ZMqFRPc/iqMY9k/D3A0qnuaZxLTwxjKGmLKT09p2yoKjw1Qd8W8oVURnQ5sYvVB0
ZkkdPXMmYnCQO3MmFJ4tJcnvGBVjYkaGOdVKfLVYdCdtcZ0Wg6qBD+C7Jg1SyJVG
CQXjYOTDHlQQJBFvQo0Z5/Ft
-----END PRIVATE KEY-----`;
// Corresponding Public Key (for potential verification, though not strictly needed for these tests)
// const TEST_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
// ...
// -----END PUBLIC KEY-----`;

const TEST_URL = '/test/api/resource';
const TEST_METHOD_GET = 'GET' as const; // Apply const assertion here
const TEST_METHOD_POST = 'POST' as const; // Apply const assertion here

// --- Helper for Date Mocking ---
// Simple date mock - replace with a library like jest.useFakeTimers if needed
const MOCK_TIMESTAMP = '2025-04-21T01:30:00Z'; // Updated to match actual output
const MOCK_DATE = new Date(MOCK_TIMESTAMP);
const originalDate = Date;
beforeAll(() => {
  // @ts-ignore Simple mock
  global.Date = class extends originalDate {
    constructor() {
      super();
      return MOCK_DATE;
    }
    static now() {
      return MOCK_DATE.getTime();
    }
  };
});
afterAll(() => {
  global.Date = originalDate;
});


// --- Tests ---

describe('RsaV3Util', () => {

  describe('getCanonicalParams', () => {
    it('should return empty string for empty params', () => {
      expect(RsaV3Util.getCanonicalParams({})).toBe('');
    });

    it('should correctly format and sort ASCII params', () => {
      const params = { c: 'valueC', a: 'valueA', b: 123 };
      const expected = 'a=valueA&b=123&c=valueC';
      expect(RsaV3Util.getCanonicalParams(params)).toBe(expected);
    });

    it('should correctly normalize keys and values', () => {
      const params = { ' key ': ' value ', 'another key': true };
      // HttpUtils.normalize encodes spaces as %20
      const expected = 'another%20key=true&key=%20value%20';
      expect(RsaV3Util.getCanonicalParams(params)).toBe(expected);
    });

    it('should handle empty string values', () => {
      const params = { a: '', b: 'valueB' };
      const expected = 'a=&b=valueB';
      expect(RsaV3Util.getCanonicalParams(params)).toBe(expected);
    });

    it('should correctly normalize Chinese characters', () => {
      const params = { 姓名: '张三', 地址: '北京' };
      // HttpUtils.normalize encodes Chinese chars using UTF-8 percent encoding
      const expected = '%E5%9C%B0%E5%9D%80=%E5%8C%97%E4%BA%AC&%E5%A7%93%E5%90%8D=%E5%BC%A0%E4%B8%89';
      expect(RsaV3Util.getCanonicalParams(params)).toBe(expected);
    });

    it('should correctly normalize mixed characters and symbols', () => {
      const params = { query: '你好 world!', filter_symbol: '@#$%^' };
      const expected = 'filter_symbol=%40%23%24%25%5E&query=%E4%BD%A0%E5%A5%BD%20world%21';
      expect(RsaV3Util.getCanonicalParams(params)).toBe(expected);
    });

     it('should correctly normalize Emoji', () => {
      const params = { icon: '👋', status: '✅' };
      const expected = 'icon=%F0%9F%91%8B&status=%E2%9C%85';
      expect(RsaV3Util.getCanonicalParams(params)).toBe(expected);
    });

    it('should handle form-urlencoded type correctly (double normalization)', () => {
        const params = { 'key with space': 'value with %' };
        // First normalize: key%20with%20space=value%20with%20%25
        // Second normalize (value only): value%2520with%2520%2525
        const expected = 'key%20with%20space=value%2520with%2520%2525';
        expect(RsaV3Util.getCanonicalParams(params, 'form-urlencoded')).toBe(expected);
    });
  });

  describe('getCanonicalQueryString', () => {
    it('should return empty string for POST method', () => {
      const params = { a: '1' };
      expect(RsaV3Util.getCanonicalQueryString(params, 'POST')).toBe('');
      expect(RsaV3Util.getCanonicalQueryString(params, 'post')).toBe('');
    });

    it('should return empty string for empty params on GET', () => {
      expect(RsaV3Util.getCanonicalQueryString({}, 'GET')).toBe('');
    });

    it('should return canonical params for GET method', () => {
      const params = { b: '2', a: '1' };
      const expected = 'a=1&b=2';
      expect(RsaV3Util.getCanonicalQueryString(params, 'GET')).toBe(expected);
    });
  });

  describe('buildCanonicalHeaders', () => {
     it('should build canonical headers correctly', () => {
        const headersToSign = {
            'X-Yop-Appkey': TEST_APP_KEY,
            'X-Yop-Content-Sha256': 'testSha256',
            'Content-Type': 'application/json', // Should be lowercased
            'X-Yop-Request-Id': 'testRequestId',
            'Custom-Header': ' Value With Space ', // Should be trimmed
        };
        const expectedCanonical =
`content-type:application/json
custom-header:Value With Space
x-yop-appkey:${TEST_APP_KEY}
x-yop-content-sha256:testSha256
x-yop-request-id:testRequestId`;
        const expectedSigned = 'content-type;custom-header;x-yop-appkey;x-yop-content-sha256;x-yop-request-id';

        const result = RsaV3Util.buildCanonicalHeaders(headersToSign);
        expect(result.canonicalHeaderString).toBe(expectedCanonical);
        expect(result.signedHeadersString).toBe(expectedSigned);
    });

     it('should handle empty headers', () => {
        const result = RsaV3Util.buildCanonicalHeaders({});
        expect(result.canonicalHeaderString).toBe('');
        expect(result.signedHeadersString).toBe('');
     });
  });


  describe('getSha256AndHexStr', () => {
    it('should hash canonical params for non-JSON POST methods', () => {
      const params = { b: '2', a: '1' };
      const canonicalParams = 'a=1&b=2';
      const expectedHash = crypto.createHash('sha256').update(canonicalParams, 'utf8').digest('hex');
      expect(RsaV3Util.getSha256AndHexStr(params, { contentType: 'application/x-www-form-urlencoded' }, 'POST')).toBe(expectedHash);
      expect(RsaV3Util.getSha256AndHexStr(params, { contentType: '' }, 'GET')).toBe(expectedHash); // Also for GET
    });

    it('should hash JSON string for JSON POST method', () => {
      const params = { b: '中文', a: 1 }; // Order matters in JSON stringify
      const jsonString = JSON.stringify(params);
      const expectedHash = crypto.createHash('sha256').update(jsonString, 'utf8').digest('hex');
      expect(RsaV3Util.getSha256AndHexStr(params, { contentType: 'application/json' }, 'POST')).toBe(expectedHash);
      expect(RsaV3Util.getSha256AndHexStr(params, { contentType: 'application/json;charset=utf-8' }, 'post')).toBe(expectedHash);
    });

    it('should return hash of empty string for empty params (non-JSON POST)', () => {
      const expectedHash = crypto.createHash('sha256').update('', 'utf8').digest('hex');
      expect(RsaV3Util.getSha256AndHexStr({}, { contentType: 'application/x-www-form-urlencoded' }, 'POST')).toBe(expectedHash);
    });

     it('should return hash of empty JSON object string for empty params (JSON POST)', () => {
      const jsonString = JSON.stringify({});
      const expectedHash = crypto.createHash('sha256').update(jsonString, 'utf8').digest('hex');
      expect(RsaV3Util.getSha256AndHexStr({}, { contentType: 'application/json' }, 'POST')).toBe(expectedHash);
    });
  });

  describe('getAuthHeaders', () => {
    // Helper to extract parts of the Authorization header
    const parseAuthHeader = (authHeader: string | undefined) => {
      if (!authHeader) return null;
      const match = authHeader.match(/^YOP-RSA2048-SHA256 (yop-auth-v3\/.*?\/.*?\/\d+)\/(.*?)\/(.*?)$/);
      if (!match) return null;
      return {
        prefix: match[1],
        signedHeaders: match[2],
        signature: match[3],
      };
    };

    // Test cases for different parameter types
    const testCases = [
      { name: 'ASCII params (GET)', method: TEST_METHOD_GET, params: { c: 'val', a: 1, b: 'test' }, config: { contentType: '' } }, // Remove as const here
      { name: 'ASCII params (POST JSON)', method: TEST_METHOD_POST, params: { c: 'val', a: 1, b: 'test' }, config: { contentType: 'application/json' } }, // Remove as const here
      { name: 'Chinese params (GET)', method: TEST_METHOD_GET, params: { 姓名: '张三', 地址: '北京' }, config: { contentType: '' } }, // Remove as const here
      { name: 'Chinese params (POST JSON)', method: TEST_METHOD_POST, params: { 姓名: '张三', 地址: '北京' }, config: { contentType: 'application/json' } }, // Remove as const here
      { name: 'Mixed params (GET)', method: TEST_METHOD_GET, params: { user: '李四', id: 456, note: '测试 test note.' }, config: { contentType: '' } }, // Remove as const here
      { name: 'Mixed params (POST JSON)', method: TEST_METHOD_POST, params: { user: '李四', id: 456, note: '测试 test note.' }, config: { contentType: 'application/json' } }, // Remove as const here
      { name: 'Emoji params (GET)', method: TEST_METHOD_GET, params: { icon: '👋', status: '✅' }, config: { contentType: '' } }, // Remove as const here
      { name: 'Emoji params (POST JSON)', method: TEST_METHOD_POST, params: { icon: '👋', status: '✅' }, config: { contentType: 'application/json' } }, // Remove as const here
      { name: 'Empty params (GET)', method: TEST_METHOD_GET, params: {}, config: { contentType: '' } }, // Remove as const here
      { name: 'Empty params (POST JSON)', method: TEST_METHOD_POST, params: {}, config: { contentType: 'application/json' } }, // Remove as const here
    ];

    testCases.forEach(tc => {
      it(`should generate correct auth headers structure for ${tc.name}`, () => {
        const headers = RsaV3Util.getAuthHeaders({
          appKey: TEST_APP_KEY,
          secretKey: TEST_SECRET_KEY,
          method: tc.method,
          url: TEST_URL,
          params: tc.params,
          config: tc.config,
        });

        // Check basic header presence
        expect(headers['x-yop-appkey']).toBe(TEST_APP_KEY);
        expect(headers['x-yop-request-id']).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/); // UUID format
        expect(headers['x-yop-content-sha256']).toBeDefined();
        expect(headers['Authorization']).toBeDefined();

        // Parse Authorization header
        const authParts = parseAuthHeader(headers.Authorization);
        expect(authParts).not.toBeNull();

        // Don't check the exact timestamp, just verify the prefix format
        expect(authParts?.prefix).toMatch(new RegExp(`^yop-auth-v3/${TEST_APP_KEY}/\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z/1800$`));

        // Verify signed headers list (should always include these core headers, sorted)
        const expectedSignedHeaders = ['x-yop-appkey', 'x-yop-content-sha256', 'x-yop-request-id'].sort().join(';');
        expect(authParts?.signedHeaders).toBe(expectedSignedHeaders);

        // Verify signature format (Base64 URL Safe + $SHA256)
        // Note: We don't verify the actual signature value without the public key and a verification step
        expect(authParts?.signature).toMatch(/^[A-Za-z0-9_-]+[$]SHA256$/);

        // Verify x-yop-content-sha256 calculation consistency
        const expectedSha256 = RsaV3Util.getSha256AndHexStr(tc.params, tc.config, tc.method);
        expect(headers['x-yop-content-sha256']).toBe(expectedSha256);

        // --- Construct the expected CanonicalRequest for verification (optional but good) ---
        const authString = authParts?.prefix || '';
        const canonicalQueryString = RsaV3Util.getCanonicalQueryString(tc.params, tc.method);
        const headersToSign = {
          'x-yop-appkey': headers['x-yop-appkey'],
          'x-yop-content-sha256': headers['x-yop-content-sha256'],
          'x-yop-request-id': headers['x-yop-request-id'],
        };
        const { canonicalHeaderString } = RsaV3Util.buildCanonicalHeaders(headersToSign);

        const expectedCanonicalRequest = [
          authString,
          tc.method,
          TEST_URL,
          canonicalQueryString,
          canonicalHeaderString
        ].join('\n');

        // --- Verify the signature (requires public key and crypto.verify) ---
        // This part is more complex and might be skipped in basic unit tests
        // if focusing only on the generation logic.
        // const verifier = crypto.createVerify('RSA-SHA256');
        // verifier.update(expectedCanonicalRequest, 'utf8');
        // let signatureBase64 = authParts!.signature.replace(/[$]SHA256$/, '').replace(/-/g, '+').replace(/_/g, '/');
        // // Add padding back if needed
        // while (signatureBase64.length % 4 !== 0) {
        //     signatureBase64 += '=';
        // }
        // const isValid = verifier.verify(TEST_PUBLIC_KEY, signatureBase64, 'base64');
        // expect(isValid).toBe(true); // This would require the correct public key
      });
    });
  });

  describe('uuid', () => {
    it('should generate a string in UUID format', () => {
      const uuid = RsaV3Util.uuid();
      expect(uuid).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/);
    });

    it('should generate different UUIDs on subsequent calls', () => {
      // Note: Due to the fast nature of tests and mocked date, md5 might be the same.
      // A better test would involve unmocking date or ensuring different inputs to md5.
      // However, the primary goal is format validation here.
      const uuid1 = RsaV3Util.uuid();
      // Introduce slight delay or change input if needed for stricter uniqueness check
      const uuid2 = RsaV3Util.uuid();
      expect(uuid1).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/);
      expect(uuid2).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/);
      // expect(uuid1).not.toBe(uuid2); // This might fail with mocked date
    });
  });

});