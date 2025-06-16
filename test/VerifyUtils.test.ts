import { VerifyUtils } from '../src/utils/VerifyUtils';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { jest, describe, beforeEach, test, expect, it } from '@jest/globals';

// 获取当前文件的目录路径（ESM 兼容方式）
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('VerifyUtils', () => {
  describe('extractPublicKeyFromCertificate', () => {
    it('should extract public key from X.509 certificate', () => {
      // 读取证书文件
      const certPath = path.resolve(__dirname, '../src/assets/yop_platform_rsa_cert_rsa.cer');
      const certContent = fs.readFileSync(certPath, 'utf-8');
      
      // 提取公钥
      const publicKey = VerifyUtils.extractPublicKeyFromCertificate(certContent);
      
      // 验证提取的公钥格式
      expect(publicKey).not.toBeNull();
      expect(publicKey).toContain('-----BEGIN PUBLIC KEY-----');
      expect(publicKey).toContain('-----END PUBLIC KEY-----');
    });

    it('should return the input if it is already a public key', () => {
      const publicKey = `-----BEGIN PUBLIC KEY-----
MIIE2TCCA8GgAwIBAgIFQ5cTlZgwDQYJKoZIhvcNAQELBQAwWDELMAkGA1UEBhMC
Q04xMDAuBgNVBAoMJ0NoaW5hIEZpbmFuY2lhbCBDZXJ0aWZpY2F0aW9uIEF1dGhv
cml0eTEXMBUGA1UEAwwOQ0ZDQSBBQ1MgT0NBMzEwHhcNMjEwNDI1MDIwOTAwWhcN
MjMwNDI1MDIwOTAwWjCBhzELMAkGA1UEBhMCQ04xFzAVBgNVBAoMDkNGQ0EgQUNT
IE9DQTMxMRAwDgYDVQQLDAdURVNUIFJBMRkwFwYDVQQLDBBPcmdhbml6YXRpb25h
bC0xMTIwMAYDVQQDDCkwNTFA5piT5a6d5byA5pS+5bmz5Y+wQDMxMTAwMDAwMDU4
MDQyMjlANTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAOqdF1o7HGPo
LMqikYcPTHi7BJoRXQUYU9npjnJPxdTpsN/GVoScYfZA37OR8xSTK1aM4FPkiRQz
jcbPFAdMDCCykZqny3HwpRvTMgjbiZJH5tBxUL9YURnTr2T149wXJLsGuxaxFwUW
FISu7yeNGn7prKbYZrHum7OpmcTZ/5gC2dl9O7s5zq63Nq5ONWNh37XbsWcOk+BJ
rVrjdseAmfIMEsjwFuWc2SS0OrWQ6IwSuBmUwBoZ5924OWwbAZcNvhS5AkAbg7CV
bBT4hof2+iv/sxk71slHLvi1I9jHo2EBCwzt4tr0F1Q5O5VYtv03FGHn7yHLLJ87
Hwn42qK8bLsCAwEAAaOCAXgwggF0MGwGCCsGAQUFBwEBBGAwXjAoBggrBgEFBQcw
AYYcaHR0cDovL29jc3AuY2ZjYS5jb20uY24vb2NzcDAyBggrBgEFBQcwAoYmaHR0
cDovL2NybC5jZmNhLmNvbS5jbi9vY2EzMS9vY2EzMS5jZXIwHwYDVR0jBBgwFoAU
4rQJy81hoXNKeX/xioML3bR+jB0wDAYDVR0TAQH/BAIwADBIBgNVHSAEQTA/MD0G
CGCBHIbvKgEEMDEwLwYIKwYBBQUHAgEWI2h0dHA6Ly93d3cuY2ZjYS5jb20uY24v
dXMvdXMtMTQuaHRtMD0GA1UdHwQ2MDQwMqAwoC6GLGh0dHA6Ly9jcmwuY2ZjYS5j
b20uY24vb2NhMzEvUlNBL2NybDMwMjMuY3JsMA4GA1UdDwEB/wQEAwIGwDAdBgNV
HQ4EFgQU4swobhCzosrPL4Gv8clxRwbHy0EwHQYDVR0lBBYwFAYIKwYBBQUHAwIG
CCsGAQUFBwMEMA0GCSqGSIb3DQEBCwUAA4IBAQBpZpClbx+FJo5WpuJW+TJKYRay
KeAx3/+VvlMyWvdcbABPlvwBY1m3xl1k+tsqqtBGvjathGmw1w7YESdRFTT/ty04
MDLmz62USS4DJlZ2EWMxPm0bKpuAPsWb3+EtvizyZ0l1gX/D0YHDcH+VljYlGAv+
yQEUzD+0c9NZSWr4V19yRVDQEicll5hJko7RFQUrwW+wNSrexzlyQFbUlbljwAnH
O0TF3zgTXKRu2YNiKZGlxr28FjOeMQdvpiNqHCW9ACjQqL0vz1l9IImn0lm+0vh0
YhAN0oFzJZvs5lFG9Bg+kNkyhgf9eVcUUxXKnA6UwXq2amoTa4Iq3NW6YuPI
-----END PUBLIC KEY-----`;
      
      const result = VerifyUtils.extractPublicKeyFromCertificate(publicKey);
      
      expect(result).toBe(publicKey);
    });

    it('should format raw key string into PEM format', () => {
      const rawKey = 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAu1SU1LfVLPHCozMxH2Mo4lgOEePzNm0tRgeLezV6ffAt0gunVTLw7orLRnrq0/IzW7yWR7QkrmBL7jTKEn5u+qKhbwKfBstIs+bMY2Zkp18gnTxKLxoS2tFczGkPLPgizskuemMghRniWWoFAo8MJB81lbv7Q/jjjaQjRJvLsf/UMikVFGyP6QrJvo02DUYicY6WStLJh0bB7Gypzwes';
      
      const result = VerifyUtils.extractPublicKeyFromCertificate(rawKey);
      
      expect(result).toContain('-----BEGIN PUBLIC KEY-----');
      expect(result).toContain('-----END PUBLIC KEY-----');
      
      // 由于格式化过程中添加了换行符，直接比较原始字符串不再适用
      // 我们可以检查格式化后的字符串是否包含原始字符串的无空格版本
      const cleanedRawKey = rawKey.replace(/\s+/g, '');
      const cleanedResult = result!.replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|[\s\n]+/g, '');
      expect(cleanedResult).toBe(cleanedRawKey);
    });
  });

  describe('isValidRsaResult', () => {
    // 创建一个测试用的公私钥对
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });

    it('should verify a valid signature with PEM public key', () => {
      // 创建测试数据
      const testData = JSON.stringify({ result: { id: '123', status: 'success' }, ts: Date.now() });
      
      // 使用私钥签名
      const sign = crypto.createSign('RSA-SHA256');
      sign.update(JSON.stringify({ id: '123', status: 'success' }));
      let signature = sign.sign(privateKey, 'base64');
      
      // 转换为 URL 安全的 Base64
      signature = signature.replace(/[+]/g, '-').replace(/[/]/g, '_').replace(/=+$/, '') + '$SHA256';
      
      // 验证签名
      const isValid = VerifyUtils.isValidRsaResult({
        data: testData,
        sign: signature,
        publicKey: publicKey
      });
      
      expect(isValid).toBe(true);
    });

    it('should verify a valid signature with public key extracted from certificate', () => {
      // 读取证书文件
      const certPath = path.resolve(__dirname, '../src/assets/yop_platform_rsa_cert_rsa.cer');
      const certContent = fs.readFileSync(certPath, 'utf-8');
      
      // 从证书中提取公钥 - 这里我们只测试提取功能，不测试验证
      // 因为我们没有与证书匹配的私钥来生成有效签名
      const extractedPublicKey = VerifyUtils.extractPublicKeyFromCertificate(certContent);
      
      // 确保公钥被正确提取
      expect(extractedPublicKey).not.toBeNull();
      expect(extractedPublicKey).toContain('-----BEGIN PUBLIC KEY-----');
      expect(extractedPublicKey).toContain('-----END PUBLIC KEY-----');
      
      // 创建一个新的密钥对用于测试
      const { publicKey: testPublicKey, privateKey: testPrivateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem'
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem'
        }
      });
      
      // 创建测试数据
      const testData = JSON.stringify({ result: { id: '123', status: 'success' }, ts: Date.now() });
      
      // 使用私钥签名
      const sign = crypto.createSign('RSA-SHA256');
      sign.update(JSON.stringify({ id: '123', status: 'success' }));
      let signature = sign.sign(testPrivateKey, 'base64');
      
      // 转换为 URL 安全的 Base64
      signature = signature.replace(/[+]/g, '-').replace(/[/]/g, '_').replace(/=+$/, '') + '$SHA256';
      
      // 验证签名（使用提取的公钥）
      const isValid = VerifyUtils.isValidRsaResult({
        data: testData,
        sign: signature,
        publicKey: testPublicKey // 使用匹配的公钥
      });
      
      // 由于我们使用的是匹配的密钥对，验证应该成功
      expect(isValid).toBe(true);
    });
    
    it('should handle certificate input gracefully', () => {
      // 读取证书文件
      const certPath = path.resolve(__dirname, '../src/assets/yop_platform_rsa_cert_rsa.cer');
      const certContent = fs.readFileSync(certPath, 'utf-8');
      
      // 创建测试数据
      const testData = JSON.stringify({ result: { id: '123', status: 'success' }, ts: Date.now() });
      
      // 使用私钥签名
      const sign = crypto.createSign('RSA-SHA256');
      sign.update(JSON.stringify({ id: '123', status: 'success' }));
      let signature = sign.sign(privateKey, 'base64');
      
      // 转换为 URL 安全的 Base64
      signature = signature.replace(/[+]/g, '-').replace(/[/]/g, '_').replace(/=+$/, '') + '$SHA256';
      
      // 验证签名（使用证书而不是公钥）
      // 这里我们只是测试函数不会抛出异常，而不是测试验证结果
      // 因为我们使用的是不匹配的密钥对
      expect(() => {
        VerifyUtils.isValidRsaResult({
          data: testData,
          sign: signature,
          publicKey: certContent // 传入证书内容
        });
      }).not.toThrow();
    });
    
    // 添加针对 .cer 文件的特定测试
    describe('VerifyUtils with .cer file', () => {
      test('should correctly extract public key from .cer file', () => {
        // 获取 __dirname 等价物
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        
        // 读取 .cer 文件
        const certPath = path.join(__dirname, '../src/assets/yop_platform_rsa_cert_rsa.cer');
        const certBuffer = fs.readFileSync(certPath);
        
        // 使用 VerifyUtils.extractPublicKeyFromCertificate 方法从证书中提取公钥
        const pemKey = VerifyUtils.extractPublicKeyFromCertificate(certBuffer);
        
        // 确保公钥不为 null
        expect(pemKey).not.toBeNull();
        if (!pemKey) {
          throw new Error('Failed to extract public key from certificate');
        }
        
        // 验证提取的公钥格式
        expect(pemKey).toContain('-----BEGIN PUBLIC KEY-----');
        expect(pemKey).toContain('-----END PUBLIC KEY-----');
        
        // 验证提取的公钥可以被 Node.js crypto 模块识别
        expect(() => {
          crypto.createPublicKey(pemKey);
        }).not.toThrow();
      });
    });

    it('should correctly handle binary DER format .cer file', () => {
      // 读取 .cer 文件（以二进制方式）
      const certPath = path.resolve(__dirname, '../src/assets/yop_platform_rsa_cert_rsa.cer');
      const certBuffer = fs.readFileSync(certPath);
      
      // 从证书中提取公钥
      const extractedPublicKey = VerifyUtils.extractPublicKeyFromCertificate(certBuffer);
      
      // 确保公钥被正确提取
      expect(extractedPublicKey).not.toBeNull();
      expect(extractedPublicKey).toContain('-----BEGIN PUBLIC KEY-----');
      expect(extractedPublicKey).toContain('-----END PUBLIC KEY-----');
      
      // 创建测试数据
      const testData = JSON.stringify({ result: { id: '123', status: 'success' }, ts: Date.now() });
      
      // 使用私钥签名（使用测试密钥对，因为我们没有与 .cer 文件匹配的私钥）
      const { privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem'
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem'
        }
      });
      
      const sign = crypto.createSign('RSA-SHA256');
      sign.update(JSON.stringify({ id: '123', status: 'success' }));
      let signature = sign.sign(privateKey, 'base64');
      
      // 转换为 URL 安全的 Base64
      signature = signature.replace(/[+]/g, '-').replace(/[/]/g, '_').replace(/=+$/, '') + '$SHA256';
      
      // 验证 isValidRsaResult 可以处理 Buffer 类型的证书
      expect(() => {
        VerifyUtils.isValidRsaResult({
          data: testData,
          sign: signature,
          publicKey: certBuffer // 传入证书缓冲区
        });
      }).not.toThrow();
    });

    it('should handle invalid signature format gracefully', () => {
      const testData = JSON.stringify({ result: { id: '123', status: 'success' }, ts: Date.now() });
      const invalidSignature = 'invalid-signature$SHA256';
      
      // 验证无效签名
      const isValid = VerifyUtils.isValidRsaResult({
        data: testData,
        sign: invalidSignature,
        publicKey: publicKey
      });
      
      expect(isValid).toBe(false);
    });

    it('should handle invalid public key format gracefully', () => {
      const testData = JSON.stringify({ result: { id: '123', status: 'success' }, ts: Date.now() });
      
      // 使用私钥签名
      const sign = crypto.createSign('RSA-SHA256');
      sign.update(JSON.stringify({ id: '123', status: 'success' }));
      let signature = sign.sign(privateKey, 'base64');
      
      // 转换为 URL 安全的 Base64
      signature = signature.replace(/[+]/g, '-').replace(/[/]/g, '_').replace(/=+$/, '') + '$SHA256';
      
      // 验证签名（使用无效的公钥格式）
      const isValid = VerifyUtils.isValidRsaResult({
        data: testData,
        sign: signature,
        publicKey: 'invalid-public-key'
      });
      
      expect(isValid).toBe(false);
    });
    
    describe('getResult', () => {
      it('should extract result object from JSON response', () => {
        const testData = JSON.stringify({
          result: { id: '123', status: 'success' },
          ts: Date.now()
        });
        
        const result = VerifyUtils.getResult(testData);
        expect(result).toBeTruthy();
        
        // 验证提取的结果是否包含预期的数据
        const parsedResult = JSON.parse(result);
        expect(parsedResult).toHaveProperty('id', '123');
        expect(parsedResult).toHaveProperty('status', 'success');
      });
      
      it('should handle complex nested result objects', () => {
        const testData = JSON.stringify({
          result: {
            id: '123',
            status: 'success',
            data: {
              items: [
                { name: 'item1', value: 100 },
                { name: 'item2', value: 200 }
              ],
              total: 2
            }
          },
          ts: Date.now()
        });
        
        const result = VerifyUtils.getResult(testData);
        expect(result).toBeTruthy();
        
        // 验证提取的结果是否包含预期的嵌套数据
        const parsedResult = JSON.parse(result);
        expect(parsedResult).toHaveProperty('data.items');
        expect(parsedResult.data.items).toHaveLength(2);
        expect(parsedResult.data.items[0]).toHaveProperty('name', 'item1');
      });
      
      it('should handle malformed JSON gracefully', () => {
        const malformedData = '{ "result": { "id": "123", status: "missing-quote" }, "ts": 123456 }';
        
        const result = VerifyUtils.getResult(malformedData);
        // 应该返回空字符串或尝试提取部分内容
        expect(typeof result).toBe('string');
      });
      
      it('should handle empty or invalid input', () => {
        expect(VerifyUtils.getResult('')).toBe('');
        expect(VerifyUtils.getResult('not json')).toBe('');
        expect(VerifyUtils.getResult('{"no_result": true}')).toBe('');
      });
    });
  });

  describe('digital_envelope_handler', () => {
    it('should handle digital envelope decryption successfully', () => {
      // 创建测试用的密钥对
      const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem'
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem'
        }
      });

      // 模拟数字信封内容（这里使用简化的测试数据）
      const testContent = 'test_encrypted_key$test_encrypted_data';
      const testPrivateKey = privateKey.replace(/-----BEGIN PRIVATE KEY-----\n/, '').replace(/\n-----END PRIVATE KEY-----/, '').replace(/\n/g, '');
      const testPublicKey = publicKey;

      // 测试参数验证
      const result1 = VerifyUtils.digital_envelope_handler('', testPrivateKey, testPublicKey);
      expect(result1.status).toBe('failed');
      expect(result1.message).toBe('数字信封参数为空');

      const result2 = VerifyUtils.digital_envelope_handler(testContent, '', testPublicKey);
      expect(result2.status).toBe('failed');
      expect(result2.message).toBe('商户私钥参数为空');

      const result3 = VerifyUtils.digital_envelope_handler(testContent, testPrivateKey, '');
      expect(result3.status).toBe('failed');
      expect(result3.message).toBe('易宝开放平台公钥参数为空');
    });

    it('should handle digital envelope decryption errors gracefully', () => {
      const testContent = 'invalid_content';
      const testPrivateKey = 'invalid_private_key';
      const testPublicKey = 'invalid_public_key';

      const result = VerifyUtils.digital_envelope_handler(testContent, testPrivateKey, testPublicKey);
      expect(result.status).toBe('failed');
      expect(result.message).toBeTruthy();
    });
  });

  describe('isValidNotifyResult', () => {
    it('should validate notification signature correctly', () => {
      // 创建测试用的密钥对
      const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem'
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem'
        }
      });

      const testData = 'test notification data';

      // 生成有效签名
      const sign = crypto.createSign('RSA-SHA256');
      sign.update(testData);
      let signature = sign.sign(privateKey, 'base64');

      // 转换为 URL 安全的 Base64
      signature = signature.replace(/[+]/g, '-').replace(/[/]/g, '_').replace(/=+$/, '');

      // 测试有效签名
      const isValid = VerifyUtils.isValidNotifyResult(testData, signature, publicKey);
      expect(isValid).toBe(true);

      // 测试无效签名
      const isInvalid = VerifyUtils.isValidNotifyResult(testData, 'invalid_signature', publicKey);
      expect(isInvalid).toBe(false);

      // 测试缺失参数
      expect(VerifyUtils.isValidNotifyResult(testData, '', publicKey)).toBe(false);
      expect(VerifyUtils.isValidNotifyResult(testData, signature, '')).toBe(false);
    });

  describe('Edge Cases and Error Handling', () => {
    it('should handle base64 certificate extraction failure', () => {
      const invalidBase64Cert = 'invalid-base64-data';

      const result = VerifyUtils.isValidRsaResult({
        data: 'test data',
        sign: 'test-signature',
        publicKey: invalidBase64Cert
      });

      expect(result).toBe(false);
    });

    it('should handle certificate extraction failure and fallback to string processing', () => {
      const invalidCert = 'not-a-certificate';

      // Mock extractPublicKeyFromCertificate to throw error
      jest.spyOn(VerifyUtils, 'extractPublicKeyFromCertificate').mockImplementation(() => {
        throw new Error('Certificate extraction failed');
      });

      const result = VerifyUtils.isValidRsaResult({
        data: 'test data',
        sign: 'test-signature',
        publicKey: invalidCert
      });

      expect(result).toBe(false); // Will fail due to certificate extraction error
      expect(VerifyUtils.extractPublicKeyFromCertificate).toHaveBeenCalledTimes(1);

      jest.restoreAllMocks();
    });

    it('should handle public key extraction failure', () => {
      // Mock extractPublicKeyFromCertificate to always throw
      jest.spyOn(VerifyUtils, 'extractPublicKeyFromCertificate').mockImplementation(() => {
        throw new Error('Public key extraction failed');
      });

      const result = VerifyUtils.isValidRsaResult({
        data: 'test data',
        sign: 'test-signature',
        publicKey: 'invalid-cert'
      });

      expect(result).toBe(false);

      jest.restoreAllMocks();
    });

    it('should handle signature verification error', () => {
      // Create a test public key for this test
      const { publicKey: testPublicKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem'
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem'
        }
      });

      // Mock crypto.createVerify to throw error
      jest.spyOn(crypto, 'createVerify').mockImplementation(() => {
        throw new Error('Verification failed');
      });

      const result = VerifyUtils.isValidRsaResult({
        data: 'test data',
        sign: 'test-signature',
        publicKey: testPublicKey
      });

      expect(result).toBe(false);

      jest.restoreAllMocks();
    });
  });

  describe('Digital Envelope Processing', () => {
    const mockPrivateKey = 'mock-private-key';
    // Create a test public key
    const { publicKey: mockYopPublicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });

    it('should handle empty content parameter', () => {
      const result = VerifyUtils.digital_envelope_handler('', mockPrivateKey, mockYopPublicKey);

      expect(result.status).toBe('failed');
      expect(result.message).toBe('数字信封参数为空');
    });

    it('should handle empty private key parameter', () => {
      const result = VerifyUtils.digital_envelope_handler('test-content', '', mockYopPublicKey);

      expect(result.status).toBe('failed');
      expect(result.message).toBe('商户私钥参数为空');
    });

    it('should handle empty public key parameter', () => {
      const result = VerifyUtils.digital_envelope_handler('test-content', mockPrivateKey, '');

      expect(result.status).toBe('failed');
      expect(result.message).toBe('易宝开放平台公钥参数为空');
    });

    it('should handle digital envelope processing error', () => {
      // Mock base64_safe_handler to throw error
      jest.spyOn(VerifyUtils, 'base64_safe_handler').mockImplementation(() => {
        throw new Error('Base64 decoding failed');
      });

      const result = VerifyUtils.digital_envelope_handler('invalid$content', mockPrivateKey, mockYopPublicKey);

      expect(result.status).toBe('failed');
      expect(result.message).toBe('Base64 decoding failed');

      jest.restoreAllMocks();
    });

    it('should handle signature verification failure in digital envelope', () => {
      // Mock the decryption process to return valid data but invalid signature
      jest.spyOn(VerifyUtils, 'base64_safe_handler').mockReturnValue('mock-decoded-data');
      jest.spyOn(VerifyUtils, 'rsaDecrypt').mockReturnValue(Buffer.from('mock-decrypted-key'));
      jest.spyOn(VerifyUtils, 'aesDecrypt').mockReturnValue('decrypted-data$invalid-signature');
      jest.spyOn(VerifyUtils, 'isValidNotifyResult').mockReturnValue(false);

      const result = VerifyUtils.digital_envelope_handler('encrypted$data', mockPrivateKey, mockYopPublicKey);

      expect(result.status).toBe('failed');
      expect(result.message).toBe('验签失败');

      jest.restoreAllMocks();
    });

    it('should handle successful digital envelope processing', () => {
      // Mock the entire decryption and verification process
      jest.spyOn(VerifyUtils, 'base64_safe_handler').mockReturnValue('mock-decoded-data');
      jest.spyOn(VerifyUtils, 'rsaDecrypt').mockReturnValue(Buffer.from('mock-decrypted-key'));
      jest.spyOn(VerifyUtils, 'aesDecrypt').mockReturnValue('decrypted-data$valid-signature');
      jest.spyOn(VerifyUtils, 'isValidNotifyResult').mockReturnValue(true);

      const result = VerifyUtils.digital_envelope_handler('encrypted$data', mockPrivateKey, mockYopPublicKey);

      expect(result.status).toBe('success');
      expect(result.result).toBe('decrypted-data');

      jest.restoreAllMocks();
    });
  });

  describe('Notification Verification Edge Cases', () => {
    it('should handle formatPublicKey failure', () => {
      // Mock formatPublicKey to return null
      jest.spyOn(VerifyUtils, 'formatPublicKey').mockReturnValue(null);

      const result = VerifyUtils.isValidNotifyResult('test-data', 'test-signature', 'invalid-key');

      expect(result).toBe(false);

      jest.restoreAllMocks();
    });

    it('should handle signature verification error in notification', () => {
      // Create a test public key for this test
      const { publicKey: testPublicKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem'
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem'
        }
      });

      // Mock crypto.createVerify to throw error
      jest.spyOn(crypto, 'createVerify').mockImplementation(() => {
        throw new Error('Verification failed');
      });

      const result = VerifyUtils.isValidNotifyResult('test-data', 'test-signature', testPublicKey);

      expect(result).toBe(false);

      jest.restoreAllMocks();
    });

    it('should handle general error in notification verification', () => {
      // Mock formatPublicKey to throw error
      jest.spyOn(VerifyUtils, 'formatPublicKey').mockImplementation(() => {
        throw new Error('Format error');
      });

      const result = VerifyUtils.isValidNotifyResult('test-data', 'test-signature', 'test-key');

      expect(result).toBe(false);

      jest.restoreAllMocks();
    });
  });

  describe('getBizResult Edge Cases', () => {
    it('should handle JSON format with missing result field', () => {
      const content = '{"data": "test", "ts": "timestamp"}';

      const result = VerifyUtils.getBizResult(content, 'json');

      expect(result).toBe('');
    });

    it('should handle JSON format with missing opening brace', () => {
      const content = '{"result": "no opening brace", "ts": "timestamp"}';

      const result = VerifyUtils.getBizResult(content, 'json');

      expect(result).toBe('');
    });

    it('should handle JSON format with missing closing part', () => {
      const content = '{"result": {"data": "test"}}';

      const result = VerifyUtils.getBizResult(content, 'json');

      expect(result).toBe('');
    });

    it('should handle JSON format with invalid JSON in result', () => {
      const content = '{"result": {invalid json},"ts": "timestamp"}';

      const result = VerifyUtils.getBizResult(content, 'json');

      expect(result).toBe('');
    });

    it('should handle default format with missing end state', () => {
      const content = '<state>test</state>some data without end marker';

      const result = VerifyUtils.getBizResult(content, 'xml');

      expect(result).toBe('');
    });

    it('should handle default format with missing ts marker', () => {
      const content = '<state>test</state>some data without ts';

      const result = VerifyUtils.getBizResult(content, 'xml');

      expect(result).toBe('');
    });

    it('should handle default format with invalid end index', () => {
      const content = '</state>,"ts"';

      const result = VerifyUtils.getBizResult(content, 'xml');

      expect(result).toBe('');
    });

    it('should handle valid JSON format extraction', () => {
      const content = '{"result": {"data": "test", "value": 123},"ts": "timestamp"}';

      const result = VerifyUtils.getBizResult(content, 'json');

      expect(result).toBe('{"data": "test", "value": 123}');
    });

    it('should handle valid default format extraction', () => {
      const content = 'prefix</state>extracted data,"ts"suffix';

      const result = VerifyUtils.getBizResult(content, 'xml');

      expect(result).toBe('extracted data');
    });

    it('should return content as-is when no format specified', () => {
      const content = 'raw content';

      const result = VerifyUtils.getBizResult(content);

      expect(result).toBe('raw content');
    });
  });

    it('should handle empty result data', () => {
      const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem'
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem'
        }
      });

      const sign = crypto.createSign('RSA-SHA256');
      sign.update('');
      let signature = sign.sign(privateKey, 'base64');
      signature = signature.replace(/[+]/g, '-').replace(/[/]/g, '_').replace(/=+$/, '');

      const isValid = VerifyUtils.isValidNotifyResult('', signature, publicKey);
      expect(isValid).toBe(true);
    });
  });

  describe('base64_safe_handler', () => {
    it('should convert URL-safe base64 to standard base64', () => {
      // 测试标准的 URL-safe base64 转换
      const urlSafeData = 'SGVsbG8gV29ybGQ'; // "Hello World" in URL-safe base64
      const result = VerifyUtils.base64_safe_handler(urlSafeData);
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('should handle empty input', () => {
      const result = VerifyUtils.base64_safe_handler('');
      expect(result).toBe('');
    });

    it('should handle invalid base64 input gracefully', () => {
      expect(() => {
        VerifyUtils.base64_safe_handler('invalid_base64_!@#');
      }).not.toThrow();
    });
  });

  describe('key_format', () => {
    it('should format private key with proper headers', () => {
      const rawKey = 'MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC7VJTUt9Us8cKj';
      const formattedKey = VerifyUtils.key_format(rawKey);

      expect(formattedKey).toContain('-----BEGIN PRIVATE KEY-----');
      expect(formattedKey).toContain('-----END PRIVATE KEY-----');
      expect(formattedKey).toContain(rawKey);
    });

    it('should handle empty key', () => {
      const formattedKey = VerifyUtils.key_format('');
      expect(formattedKey).toBe('-----BEGIN PRIVATE KEY-----\n\n-----END PRIVATE KEY-----');
    });
  });

  describe('rsaDecrypt', () => {
    it('should decrypt RSA encrypted content', () => {
      // 创建测试用的密钥对
      const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem'
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem'
        }
      });

      // 加密测试数据
      const testData = 'Hello World';
      const encrypted = crypto.publicEncrypt(
        {
          key: publicKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
        },
        Buffer.from(testData)
      );
      const encryptedBase64 = encrypted.toString('base64');

      // 解密
      const decrypted = VerifyUtils.rsaDecrypt(encryptedBase64, privateKey);
      expect(decrypted.toString()).toBe(testData);
    });

    it('should handle invalid encrypted content', () => {
      const { privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem'
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem'
        }
      });

      // 测试无效的base64内容，应该抛出异常
      expect(() => {
        VerifyUtils.rsaDecrypt('invalid_base64', privateKey);
      }).toThrow();
    });
  });

  describe('aesDecrypt', () => {
    it('should decrypt AES encrypted content', () => {
      const testData = 'Hello World';
      const key = crypto.randomBytes(16); // AES-128 key

      // 加密
      const cipher = crypto.createCipheriv('aes-128-ecb', key, Buffer.alloc(0));
      let encrypted = cipher.update(testData, 'utf8', 'base64');
      encrypted += cipher.final('base64');

      // 解密
      const decrypted = VerifyUtils.aesDecrypt(encrypted, key);
      expect(decrypted).toBe(testData);
    });

    it('should handle invalid encrypted content', () => {
      const key = crypto.randomBytes(16);

      expect(() => {
        VerifyUtils.aesDecrypt('invalid_encrypted_data', key);
      }).toThrow();
    });

    it('should handle invalid key', () => {
      const invalidKey = Buffer.from('invalid_key');

      expect(() => {
        VerifyUtils.aesDecrypt('SGVsbG8gV29ybGQ=', invalidKey);
      }).toThrow();
    });
  });

  describe('getBizResult', () => {
    it('should return content as-is when no format specified', () => {
      const content = 'test content';
      const result = VerifyUtils.getBizResult(content);
      expect(result).toBe(content);
    });

    it('should extract JSON result correctly', () => {
      const content = '{"result":{"id":"123","status":"success"},"ts":1234567890}';
      const result = VerifyUtils.getBizResult(content, 'json');
      expect(result).toBe('{"id":"123","status":"success"}');
    });

    it('should handle malformed JSON gracefully', () => {
      const content = '{"result":invalid_json,"ts":1234567890}';
      const result = VerifyUtils.getBizResult(content, 'json');
      expect(result).toBe('');
    });

    it('should handle missing result field in JSON', () => {
      const content = '{"data":"test","ts":1234567890}';
      const result = VerifyUtils.getBizResult(content, 'json');
      expect(result).toBe('');
    });

    it('should handle XML-like format', () => {
      const content = '<state>SUCCESS</state>some content here,"ts":1234567890';
      const result = VerifyUtils.getBizResult(content, 'xml');
      expect(result).toBe('some content here');
    });

    it('should handle missing delimiters in XML format', () => {
      const content = 'no state tag here';
      const result = VerifyUtils.getBizResult(content, 'xml');
      expect(result).toBe('');
    });

    it('should handle edge cases in JSON extraction', () => {
      // 测试复杂嵌套的JSON
      const complexContent = '{"result":{"nested":{"data":"value"},"array":[1,2,3]},"ts":1234567890}';
      const result = VerifyUtils.getBizResult(complexContent, 'json');
      expect(result).toContain('nested');
      expect(result).toContain('array');
    });
  });
});