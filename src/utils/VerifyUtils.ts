import crypto from 'crypto';
import URLSafeBase64 from 'urlsafe-base64';

interface VerifyParams {
  data: string;
  sign: string;
  publicKey: string | Buffer;
}

interface DigitalEnvelopeResult {
  status: 'success' | 'failed';
  result: string;
  message: string;
}

export class VerifyUtils {
  /**
   * Extracts a public key from an X.509 certificate
   * @param certificate - PEM formatted X.509 certificate or DER format certificate (Buffer)
   * @returns Extracted public key in PEM format or null if extraction fails
   */
  static extractPublicKeyFromCertificate(
    certificate: string | Buffer,
  ): string | null {
    try {
      // 如果输入为空，直接返回 null
      if (!certificate) {
        return null;
      }

      // 如果输入是 Buffer（可能是 DER 格式的证书），优先处理
      if (Buffer.isBuffer(certificate)) {
        try {
          // 首先尝试使用 X509Certificate 类（Node.js v15.6.0+）
          // 这是处理 DER 格式证书的最佳方式
          const cert = new crypto.X509Certificate(certificate);
          const pemKey = cert.publicKey
            .export({
              type: 'spki',
              format: 'pem',
            })
            .toString();

          // 将换行符替换为 \n，确保格式一致性
          return pemKey.replace(/\r?\n/g, '\n');
        } catch (_x509Error) {
          // 如果 X509Certificate 失败，尝试直接作为 DER 格式的 SPKI 处理
          try {
            const publicKey = crypto.createPublicKey({
              key: certificate,
              format: 'der',
              type: 'spki',
            });

            const pemKey = publicKey
              .export({
                type: 'spki',
                format: 'pem',
              })
              .toString();

            return pemKey.replace(/\r?\n/g, '\n');
          } catch (derError) {
            console.error(
              'Error extracting public key from DER certificate:',
              derError,
            );
            return null;
          }
        }
      }

      // 如果输入是字符串
      if (typeof certificate === 'string') {
        // 规范化 PEM 字符串：修复换行符
        const normalizedCert = certificate
          .replace(/\r\n/g, '\n')
          .replace(/\r/g, '\n');

        // 检查输入是否已经是格式良好的公钥
        if (
          normalizedCert.includes('-----BEGIN PUBLIC KEY-----') &&
          normalizedCert.includes('-----END PUBLIC KEY-----')
        ) {
          // 规范化公钥格式
          return this.normalizePemFormat(normalizedCert);
        }

        // 检查输入是否是 PEM 格式的证书
        if (normalizedCert.includes('-----BEGIN CERTIFICATE-----')) {
          try {
            // 使用 Node.js crypto 从 PEM 证书中提取公钥
            const publicKey = crypto.createPublicKey({
              key: normalizedCert,
              format: 'pem',
            });

            // 导出 PEM 格式的公钥，确保格式一致性
            const pemKey = publicKey
              .export({
                type: 'spki',
                format: 'pem',
              })
              .toString();

            // 将换行符替换为 \n，确保格式一致性
            return pemKey.replace(/\r?\n/g, '\n');
          } catch (certError) {
            console.error(
              'Error extracting public key from PEM certificate:',
              certError,
            );
            return null;
          }
        }

        // 如果字符串不包含 PEM 标记，可能是被错误地以 UTF-8 方式读取的 DER 格式证书
        // 尝试使用 latin1 编码将其转换回 Buffer 并作为 DER 格式处理
        // 注意：latin1 编码保留所有字节的原始值（0x00-0xFF），比 UTF-8 更适合处理二进制数据
        if (!normalizedCert.includes('-----BEGIN')) {
          try {
            // 使用 latin1 编码将字符串转换回 Buffer
            const certBuffer = Buffer.from(certificate, 'latin1');

            // 检查是否看起来像 DER 格式（以 0x30 SEQUENCE 标签开头）
            if (certBuffer.length > 0 && certBuffer[0] === 0x30) {
              // 尝试使用 X509Certificate 类解析
              try {
                const cert = new crypto.X509Certificate(certBuffer);
                const pemKey = cert.publicKey
                  .export({
                    type: 'spki',
                    format: 'pem',
                  })
                  .toString();
                return pemKey.replace(/\r?\n/g, '\n');
              } catch (_x509Error) {
                // X509Certificate 失败，继续尝试其他方法
              }
            }
          } catch (_derError) {
            // latin1 转换失败，继续尝试其他方法
          }
        }

        // 如果输入看起来像是原始公钥（没有 PEM 头尾），尝试格式化它
        try {
          const formattedKey = this.formatPublicKey(normalizedCert);
          return formattedKey;
        } catch (_error) {
          return null;
        }
      }

      // 如果所有方法都失败，返回 null
      return null;
    } catch (_error) {
      return null;
    }
  }

  /**
   * Normalizes PEM format by ensuring proper line breaks and headers/footers
   * @param pem - PEM formatted string
   * @returns Normalized PEM string
   */
  private static normalizePemFormat(pem: string): string {
    // 首先标准化换行符
    const normalized = pem.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // 检查是否已经是正确的格式
    const lines = normalized.split('\n');
    const beginIndex = lines.findIndex((line) => line.includes('-----BEGIN'));
    const endIndex = lines.findIndex((line) => line.includes('-----END'));

    // 如果没有找到标记或标记位置不对，返回原始输入
    if (beginIndex === -1 || endIndex === -1 || endIndex <= beginIndex) {
      return pem;
    }

    // 提取标记 - 使用非空断言，因为我们已经验证了索引有效
    const beginLine = lines[beginIndex];
    const endLine = lines[endIndex];
    if (!beginLine || !endLine) {
      return pem;
    }
    const beginMarker = beginLine.trim();
    const endMarker = endLine.trim();

    // 提取内容行（不包括标记行）
    const contentLines: string[] = [];
    for (let i = beginIndex + 1; i < endIndex; i++) {
      const line = lines[i];
      if (line) {
        const trimmedLine = line.trim();
        if (trimmedLine) {
          contentLines.push(trimmedLine);
        }
      }
    }

    // 重新组装，确保每行最多 64 字符
    let formattedContent = '';
    let currentLine = '';

    for (const line of contentLines) {
      currentLine += line;

      if (currentLine.length >= 64) {
        formattedContent += currentLine.substring(0, 64) + '\n';
        currentLine = currentLine.substring(64);
      }
    }

    // 添加剩余的内容
    if (currentLine) {
      formattedContent += currentLine + '\n';
    }

    return `${beginMarker}\n${formattedContent}${endMarker}`;
  }

  /**
   * Formats a raw public key string into PEM format
   * @param rawKey - The raw public key string
   * @returns Formatted PEM public key
   */
  /**
   * 格式化原始公钥字符串为 PEM 格式
   * @param rawKey - 原始公钥字符串
   * @returns 格式化的 PEM 公钥或 null（如果输入无效）
   */
  static formatPublicKey(rawKey: string): string | null {
    try {
      // 如果输入为空，直接返回 null
      if (!rawKey || typeof rawKey !== 'string') {
        return null;
      }

      // 如果输入已经是格式良好的公钥，直接返回（规范化格式）
      if (
        rawKey.includes('-----BEGIN PUBLIC KEY-----') &&
        rawKey.includes('-----END PUBLIC KEY-----')
      ) {
        return this.normalizePemFormat(rawKey);
      }

      // 清理输入，移除任何现有的 PEM 头尾和空白
      const cleanKey = rawKey
        .replace(/-----BEGIN PUBLIC KEY-----/g, '')
        .replace(/-----END PUBLIC KEY-----/g, '')
        .replace(/-----BEGIN CERTIFICATE-----/g, '')
        .replace(/-----END CERTIFICATE-----/g, '')
        .replace(/\s+/g, '');

      // 验证清理后的内容是否为有效的 base64
      if (!/^[A-Za-z0-9+/=]+$/.test(cleanKey)) {
        return null;
      }

      // 格式化为 PEM 格式
      const BEGIN_MARKER = '-----BEGIN PUBLIC KEY-----';
      const END_MARKER = '-----END PUBLIC KEY-----';
      let formattedKey = '';
      const len = cleanKey.length;
      let start = 0;

      while (start < len) {
        const chunk = cleanKey.substring(start, start + 64);
        formattedKey += chunk + '\n';
        start += 64;
      }

      return BEGIN_MARKER + '\n' + formattedKey + END_MARKER;
    } catch (_error) {
      return null;
    }
  }

  /**
   * Validates RSA signature for business results
   * @param params - Parameters containing data, sign, and publicKey
   * @returns Whether the signature is valid
   */
  /**
   * 验证 RSA 签名
   * @param params - 包含数据、签名和公钥的参数
   * @returns 签名是否有效
   */
  static isValidRsaResult(params: VerifyParams): boolean {
    try {
      // 验证输入参数
      if (!params || !params.data || !params.sign || !params.publicKey) {
        return false;
      }

      // 1. 处理数据
      const result = this.getResult(params.data);

      let sb = '';
      if (!result) {
        sb = '';
      } else {
        sb += result.trim();
      }

      // 移除所有空白字符，确保一致的格式
      sb = sb.replace(/[\s]{2,}/g, '');
      sb = sb.replace(/\n/g, '');
      sb = sb.replace(/[\s]/g, '');

      // 2. 处理签名
      if (!params.sign) {
        return false;
      }

      let sign = params.sign.replace('$SHA256', '');
      // 将 URL 安全的 Base64 转换为标准 Base64
      sign = sign.replace(/[-]/g, '+');
      sign = sign.replace(/[_]/g, '/');

      // 添加可能缺失的填充
      while (sign.length % 4 !== 0) {
        sign += '=';
      }

      // 验证签名是否为有效的 base64
      if (!/^[A-Za-z0-9+/=]+$/.test(sign)) {
        console.error(
          '[VerifyUtils] Invalid signature format: not valid base64',
        );
        return false;
      }

      // 3. 处理公钥
      let public_key: string | null = null;

      // 检查输入是否是 Buffer（二进制证书）
      if (Buffer.isBuffer(params.publicKey)) {
        public_key = this.extractPublicKeyFromCertificate(params.publicKey);
      } else if (typeof params.publicKey === 'string') {
        // 检查是否是 Base64 编码的 DER 格式证书
        try {
          if (params.publicKey.match(/^[A-Za-z0-9+/]+={0,2}$/)) {
            // 尝试将其解码为 Buffer 并作为 DER 格式处理
            const certBuffer = Buffer.from(params.publicKey, 'base64');
            public_key = this.extractPublicKeyFromCertificate(certBuffer);
          }
        } catch (_e) {
          // 忽略错误，继续尝试其他方法
        }

        // 如果上面的方法失败，尝试作为字符串处理
        if (!public_key) {
          public_key = this.extractPublicKeyFromCertificate(params.publicKey);
        }
      }

      if (!public_key) {
        console.error('Failed to extract public key from certificate');
        return false;
      }

      // 验证提取的公钥格式是否正确
      try {
        crypto.createPublicKey(public_key);
      } catch (keyError) {
        console.error(
          '[VerifyUtils] Invalid public key format:',
          keyError instanceof Error ? keyError.message : String(keyError),
        );
        return false;
      }

      // 4. 验证签名
      try {
        // 创建验证对象
        const verify = crypto.createVerify('RSA-SHA256');
        verify.update(sb);

        // 执行验证
        const res = verify.verify(public_key, sign, 'base64');
        if (!res) {
          console.error(
            `[VerifyUtils] RSA signature verification failed. Sign: ${params.sign.substring(0, 20)}..., Data length: ${sb.length}`,
          );
        }
        return res;
      } catch (verifyError) {
        console.error(
          '[VerifyUtils] Signature verification error:',
          verifyError instanceof Error
            ? verifyError.message
            : String(verifyError),
        );
        return false;
      }
    } catch (error) {
      console.error(
        '[VerifyUtils] isValidRsaResult error:',
        error instanceof Error ? error.message : String(error),
      );
      return false;
    }
  }

  /**
   * Extracts result from response string
   * @param str - Response string
   * @returns Extracted result
   */
  static getResult(str: string): string {
    try {
      // 尝试解析完整的 JSON 响应
      const parsedResponse = JSON.parse(str);

      // 如果存在 result 字段，将其转换回 JSON 字符串
      if (parsedResponse && typeof parsedResponse.result === 'object') {
        return JSON.stringify(parsedResponse.result);
      }

      // 如果无法通过 JSON 解析获取 result，回退到正则表达式方法
      const match = str.match(/"result"\s*:\s*({.*?})\s*,\s*"ts"/s);
      if (match && match[1]) {
        return match[1];
      }

      // 如果正则表达式也失败，尝试更宽松的匹配
      const looseMatch = str.match(/"result"\s*:\s*(\{[^]*?\})/);
      if (looseMatch && looseMatch[1]) {
        // 尝试验证提取的 JSON 是否有效
        try {
          JSON.parse(looseMatch[1]);
          return looseMatch[1];
        } catch (_e) {
          // 如果解析失败，忽略并继续
        }
      }

      // 如果所有方法都失败，返回空字符串
      return '';
    } catch (_e) {
      // 如果 JSON 解析失败，回退到正则表达式方法
      const match = str.match(/"result"\s*:\s*({.*?})\s*,\s*"ts"/s);
      return match ? (match[1] ?? '') : '';
    }
  }

  /**
   * Handles digital envelope decryption
   * @param content - Digital envelope content
   * @param isv_private_key - Merchant private key
   * @param yop_public_key - YOP platform public key
   * @returns Processing result
   */
  static digital_envelope_handler(
    content: string,
    isv_private_key: string,
    yop_public_key: string,
  ): DigitalEnvelopeResult {
    const event: DigitalEnvelopeResult = {
      status: 'failed',
      result: '',
      message: '',
    };

    if (!content) {
      event.message = '数字信封参数为空';
    } else if (!isv_private_key) {
      event.message = '商户私钥参数为空';
    } else if (!yop_public_key) {
      event.message = '易宝开放平台公钥参数为空';
    } else {
      try {
        const digital_envelope_arr = content.split('$');
        // Provide default empty string if array element is undefined
        const encryted_key_safe = this.base64_safe_handler(
          digital_envelope_arr[0] ?? '',
        );
        const decryted_key = this.rsaDecrypt(
          encryted_key_safe,
          this.key_format(isv_private_key),
        );
        const biz_param_arr = this.aesDecrypt(
          // Provide default empty string if array element is undefined
          this.base64_safe_handler(digital_envelope_arr[1] ?? ''),
          decryted_key,
        ).split('$');

        const sign = biz_param_arr.pop() || '';
        event.result = biz_param_arr.join('$');

        if (this.isValidNotifyResult(event.result, sign, yop_public_key)) {
          event.status = 'success';
        } else {
          event.message = '验签失败';
        }
      } catch (error) {
        console.error(
          `[VerifyUtils] Digital envelope processing failed: ${error instanceof Error ? error.message : String(error)}`,
        );
        event.message = error instanceof Error ? error.message : String(error);
      }
    }

    return event;
  }

  /**
   * Validates merchant notification signature
   * @param result - Result data
   * @param sign - Signature
   * @param public_key - Public key
   * @returns Whether the signature is valid
   */
  /**
   * 验证商户通知签名
   * @param result - 结果数据
   * @param sign - 签名
   * @param publicKeyStr - 公钥
   * @returns 签名是否有效
   */
  static isValidNotifyResult(
    result: string,
    sign: string,
    publicKeyStr: string,
  ): boolean {
    try {
      // 验证输入参数
      if (!sign || !publicKeyStr) {
        console.warn(
          'Missing signature or public key for notification verification',
        );
        return false;
      }

      // 处理数据
      let sb = '';
      if (!result) {
        sb = '';
      } else {
        sb += result;
      }

      // 处理签名
      sign = sign + '';
      sign = sign.replace(/[-]/g, '+');
      sign = sign.replace(/[_]/g, '/');

      // 添加可能缺失的填充
      while (sign.length % 4 !== 0) {
        sign += '=';
      }

      // 验证签名是否为有效的 base64
      if (!/^[A-Za-z0-9+/=]+$/.test(sign)) {
        console.error(
          '[VerifyUtils] Invalid signature format: not valid base64',
        );
        return false;
      }

      // 处理公钥 - 使用改进的公钥处理逻辑
      const formattedPublicKey = this.formatPublicKey(publicKeyStr);
      if (!formattedPublicKey) {
        console.error('[VerifyUtils] Failed to format public key');
        return false;
      }

      // 验证提取的公钥格式是否正确
      try {
        crypto.createPublicKey(formattedPublicKey);
      } catch (keyError) {
        console.error(
          '[VerifyUtils] Invalid public key format:',
          keyError instanceof Error ? keyError.message : String(keyError),
        );
        return false;
      }

      // 验证签名
      try {
        const verify = crypto.createVerify('RSA-SHA256');
        verify.update(sb);
        const res = verify.verify(formattedPublicKey, sign, 'base64');
        if (!res) {
          console.error(
            `[VerifyUtils] Notification signature verification failed. Sign: ${sign.substring(0, 20)}...`,
          );
        }
        return res;
      } catch (verifyError) {
        console.error(
          '[VerifyUtils] Notification signature verification error:',
          verifyError instanceof Error
            ? verifyError.message
            : String(verifyError),
        );
        return false;
      }
    } catch (error) {
      console.error(
        '[VerifyUtils] isValidNotifyResult error:',
        error instanceof Error ? error.message : String(error),
      );
      return false;
    }
  }

  /**
   * Restores base64 safe data
   * @param data - Data to restore
   * @returns Restored data
   */
  static base64_safe_handler(data: string): string {
    try {
      if (!data || typeof data !== 'string') {
        return '';
      }
      return URLSafeBase64.decode(data).toString('base64');
    } catch (error) {
      console.error(
        `[VerifyUtils] Base64 decoding failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new Error('Base64 decoding failed');
    }
  }

  /**
   * Formats private key with header
   * @param key - Private key without header
   * @returns Formatted private key
   */
  static key_format(key: string): string {
    return (
      '-----BEGIN PRIVATE KEY-----\n' + key + '\n-----END PRIVATE KEY-----'
    );
  }

  /**
   * Decrypts data using RSA
   * @param content - Encrypted content
   * @param privateKey - Private key
   * @returns Decrypted data
   */
  static rsaDecrypt(content: string, privateKey: string): Buffer {
    const block = Buffer.from(content, 'base64');
    // Use padding which is compatible with modern Node.js versions
    const decodeData = crypto.privateDecrypt(
      {
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_PADDING,
      },
      block,
    );
    return decodeData;
  }

  /**
   * Decrypts data using AES
   * @param encrypted - Encrypted content
   * @param key - Encryption key
   * @returns Decrypted data
   */
  static aesDecrypt(encrypted: string, key: Buffer): string {
    const decipher = crypto.createDecipheriv(
      'aes-128-ecb',
      key,
      Buffer.alloc(0),
    );
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Gets business result from content
   * @param content - Content to extract from
   * @param format - Format of the content
   * @returns Extracted business result
   */
  static getBizResult(content: string, format?: string): string {
    // WARNING: This method uses fragile string manipulation (indexOf, substr)
    // to extract data based on assumed delimiters ("result", "ts", "</state>").
    // It's highly recommended to parse the content properly (e.g., using JSON.parse
    // if format is 'json') instead of relying on these string operations.
    if (!format) {
      return content;
    }

    let local: number;
    let result: string;
    // let tmp_result = ""; // tmp_result seems unused or incorrectly used below
    // let length = 0; // length seems unused or incorrectly used below

    switch (format) {
      case 'json': {
        // Attempt to find the start of the result object after "result":
        local = content.indexOf('"result"');
        if (local === -1) return ''; // Or throw error? Handle case where "result" is not found
        // Find the opening brace after "result":
        const openBraceIndex = content.indexOf('{', local + 8); // Search after "result":
        if (openBraceIndex === -1) return ''; // Handle case where '{' is not found

        // Find the closing brace and the subsequent comma before "ts"
        // This is still fragile. A proper JSON parse is much better.
        const closingPartIndex = content.lastIndexOf('},"ts"');
        if (closingPartIndex === -1 || closingPartIndex < openBraceIndex)
          return ''; // Handle case where closing part is not found

        result = content.substring(openBraceIndex, closingPartIndex + 1); // Extract content between {}
        try {
          // Validate if the extracted part is valid JSON (optional but good)
          JSON.parse(result);
          return result;
        } catch (_e) {
          return ''; // Return empty or throw if validation fails
        }
      }

      default: {
        // Assuming XML-like structure?
        // Corrected potential typo: '</state>' instead of '"</state>"'
        local = content.indexOf('</state>');
        if (local === -1) return ''; // Handle case where '</state>' is not found

        // Find the start of the relevant content after '</state>'
        // The original logic `result.substr(length + 4)` was unclear. Assuming we need content after </state>.
        const startIndex = local + '</state>'.length;

        // Find the end before ',"ts"' (assuming this delimiter exists)
        const endIndex = content.lastIndexOf(',"ts"'); // Assuming ,"ts" marks the end
        if (endIndex === -1 || endIndex <= startIndex) return ''; // Handle case where end delimiter is not found

        result = content.substring(startIndex, endIndex).trim(); // Extract and trim whitespace
        // The original `result.substr(0, -2)` was likely incorrect.
        return result; // Return the extracted substring
      }
    }
  }
}

export default VerifyUtils;
