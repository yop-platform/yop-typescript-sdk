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
   * Extracts public key from X.509 certificate or formats raw key to PEM format
   * @param certOrKey - Certificate content, PEM public key, or raw public key
   * @returns Extracted or formatted public key in PEM format
   */
  static extractPublicKeyFromCertificate(certOrKey: string | Buffer): string {
    try {
      // 如果输入是Buffer，转换为字符串
      const certOrKeyStr = Buffer.isBuffer(certOrKey) ? certOrKey.toString('utf-8') : certOrKey;
      
      // 如果已经是PEM格式的公钥，直接返回
      if (certOrKeyStr.includes('-----BEGIN PUBLIC KEY-----') && certOrKeyStr.includes('-----END PUBLIC KEY-----')) {
        return certOrKeyStr;
      }
      
      // 如果是X.509证书，尝试提取公钥
      if (certOrKeyStr.includes('-----BEGIN CERTIFICATE-----') && certOrKeyStr.includes('-----END CERTIFICATE-----')) {
        try {
          // 使用Node.js的crypto模块从证书中提取公钥
          const cert = crypto.createPublicKey({
            key: certOrKeyStr,
            format: 'pem',
          });
          return cert.export({ format: 'pem', type: 'spki' }).toString();
        } catch (error) {
          console.warn(`Failed to extract public key from certificate: ${error instanceof Error ? error.message : String(error)}`);
          // 如果提取失败，返回原始证书内容
          return certOrKeyStr;
        }
      }
      
      // 如果是原始公钥字符串，格式化为PEM格式
      // 移除所有空白字符
      const cleanKey = certOrKeyStr.replace(/\s+/g, '');
      
      // 分块添加换行符（每64个字符一行）
      let formattedKey = '';
      for (let i = 0; i < cleanKey.length; i += 64) {
        formattedKey += cleanKey.substring(i, i + 64) + '\n';
      }
      
      // 添加PEM头尾
      return `-----BEGIN PUBLIC KEY-----\n${formattedKey}-----END PUBLIC KEY-----`;
    } catch (error) {
      console.warn(`Error in extractPublicKeyFromCertificate: ${error instanceof Error ? error.message : String(error)}`);
      // 如果处理失败，返回原始输入
      return Buffer.isBuffer(certOrKey) ? certOrKey.toString('utf-8') : certOrKey;
    }
  }
  /**
   * Validates RSA signature for business results
   * @param params - Parameters containing data, sign, and publicKey
   * @returns Whether the signature is valid
   */
  static isValidRsaResult(params: VerifyParams): boolean {
    try {
      const result = this.getResult(params.data);
      let sign = params.sign.replace('$SHA256', '');
      let sb = "";

      if (!result) {
        sb = "";
      } else {
        sb += result.trim();
      }

      sb = sb.replace(/[\s]{2,}/g, "");
      sb = sb.replace(/\n/g, "");
      sb = sb.replace(/[\s]/g, "");

      // 使用 extractPublicKeyFromCertificate 确保公钥格式正确
      let public_key;
      try {
        public_key = this.extractPublicKeyFromCertificate(params.publicKey);
      } catch (error) {
        console.warn(`Failed to process public key: ${error instanceof Error ? error.message : String(error)}`);
        return false;
      }

      // 创建公钥对象
      let publicKeyObject;
      try {
        publicKeyObject = crypto.createPublicKey({
          key: public_key,
          format: 'pem'
        });
      } catch (error) {
        console.warn(`Failed to create public key object: ${error instanceof Error ? error.message : String(error)}`);
        return false;
      }

      let verify = crypto.createVerify('RSA-SHA256');
      verify.update(sb);
      sign = sign + "";
      // sign = sign.substr(0,-7);
      sign = sign.replace(/[-]/g, '+');
      sign = sign.replace(/[_]/g, '/');
      
      // 使用公钥对象进行验证
      let res = verify.verify(publicKeyObject, sign, 'base64');

      return res;
    } catch (error) {
      console.warn(`Error in isValidRsaResult: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Extracts result from response string
   * @param str - Response string
   * @returns Extracted result
   */
  static getResult(str: string): string {
    const match = str.match(/"result"\s*:\s*({.*}),\s*"ts"/s);
    // Use nullish coalescing to ensure match[1] provides a string even if undefined (though regex should capture if match exists)
    return match ? (match[1] ?? '') : '';
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
    yop_public_key: string
  ): DigitalEnvelopeResult {
    let event: DigitalEnvelopeResult = {
      status: 'failed',
      result: '',
      message: ''
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
        const encryted_key_safe = this.base64_safe_handler(digital_envelope_arr[0] ?? '');
        const decryted_key = this.rsaDecrypt(encryted_key_safe, this.key_format(isv_private_key));
        const biz_param_arr = this.aesDecrypt(
          // Provide default empty string if array element is undefined
          this.base64_safe_handler(digital_envelope_arr[1] ?? ''),
          decryted_key
        ).split('$');

        const sign = biz_param_arr.pop() || '';
        event.result = biz_param_arr.join('$');

        if (this.isValidNotifyResult(event.result, sign, yop_public_key)) {
          event.status = 'success';
        } else {
          event.message = '验签失败';
        }
      } catch (error) {
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
  static isValidNotifyResult(result: string, sign: string, public_key: string): boolean {
    try {
      let sb = "";

      if (!result) {
        sb = "";
      } else {
        sb += result;
      }

      // 使用 extractPublicKeyFromCertificate 确保公钥格式正确
      let formattedPublicKey;
      try {
        formattedPublicKey = this.extractPublicKeyFromCertificate(public_key);
      } catch (error) {
        console.warn(`Failed to process public key in isValidNotifyResult: ${error instanceof Error ? error.message : String(error)}`);
        return false;
      }

      // 创建公钥对象
      let publicKeyObject;
      try {
        publicKeyObject = crypto.createPublicKey({
          key: formattedPublicKey,
          format: 'pem'
        });
      } catch (error) {
        console.warn(`Failed to create public key object in isValidNotifyResult: ${error instanceof Error ? error.message : String(error)}`);
        return false;
      }

      let verify = crypto.createVerify('RSA-SHA256');
      verify.update(sb);
      sign = sign + "";
      // sign = sign.substr(0,-7);
      sign = sign.replace(/[-]/g, '+');
      sign = sign.replace(/[_]/g, '/');
      
      // 使用公钥对象进行验证
      let res = verify.verify(publicKeyObject, sign, 'base64');

      return res;
    } catch (error) {
      console.warn(`Error in isValidNotifyResult: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Restores base64 safe data
   * @param data - Data to restore
   * @returns Restored data
   */
  static base64_safe_handler(data: string): string {
    return URLSafeBase64.decode(data).toString('base64');
  }

  /**
   * Formats private key with header
   * @param key - Private key without header
   * @returns Formatted private key
   */
  static key_format(key: string): string {
    return '-----BEGIN PRIVATE KEY-----\n' + key + '\n-----END PRIVATE KEY-----';
  }

  /**
   * Decrypts data using RSA
   * @param content - Encrypted content
   * @param privateKey - Private key
   * @returns Decrypted data
   */
  static rsaDecrypt(content: string, privateKey: string): Buffer {
    const block = Buffer.from(content, 'base64');
    const decodeData = crypto.privateDecrypt(
      {
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_PADDING
      },
      block
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
    const decipher = crypto.createDecipheriv('aes-128-ecb', key, Buffer.alloc(0));
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
      case 'json':
        // Attempt to find the start of the result object after "result":
        local = content.indexOf('"result"');
        if (local === -1) return ""; // Or throw error? Handle case where "result" is not found
        // Find the opening brace after "result":
        const openBraceIndex = content.indexOf('{', local + 8); // Search after "result":
        if (openBraceIndex === -1) return ""; // Handle case where '{' is not found

        // Find the closing brace and the subsequent comma before "ts"
        // This is still fragile. A proper JSON parse is much better.
        const closingPartIndex = content.lastIndexOf('},"ts"');
        if (closingPartIndex === -1 || closingPartIndex < openBraceIndex) return ""; // Handle case where closing part is not found

        result = content.substring(openBraceIndex, closingPartIndex + 1); // Extract content between {}
        try {
          // Validate if the extracted part is valid JSON (optional but good)
          JSON.parse(result);
          return result;
        } catch (e) {
          console.error("Extracted 'result' is not valid JSON in getBizResult:", result);
          return ""; // Return empty or throw if validation fails
        }

      default: // Assuming XML-like structure?
        // Corrected potential typo: '</state>' instead of '"</state>"'
        local = content.indexOf('</state>');
        if (local === -1) return ""; // Handle case where '</state>' is not found

        // Find the start of the relevant content after '</state>'
        // The original logic `result.substr(length + 4)` was unclear. Assuming we need content after </state>.
        const startIndex = local + '</state>'.length;

        // Find the end before ',"ts"' (assuming this delimiter exists)
        const endIndex = content.lastIndexOf(',"ts"'); // Assuming ,"ts" marks the end
        if (endIndex === -1 || endIndex <= startIndex) return ""; // Handle case where end delimiter is not found

        result = content.substring(startIndex, endIndex).trim(); // Extract and trim whitespace
        // The original `result.substr(0, -2)` was likely incorrect.
        return result; // Return the extracted substring
    }
  }
}

export default VerifyUtils;