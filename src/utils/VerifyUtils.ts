import crypto from 'crypto';
import URLSafeBase64 from 'urlsafe-base64';

interface VerifyParams {
  data: string;
  sign: string;
  publicKey: string;
}

interface DigitalEnvelopeResult {
  status: 'success' | 'failed';
  result: string;
  message: string;
}

export class VerifyUtils {
  /**
   * Validates RSA signature for business results
   * @param params - Parameters containing data, sign, and publicKey
   * @returns Whether the signature is valid
   */
  static isValidRsaResult(params: VerifyParams): boolean {
    const result = this.getResult(params.data);
    let sign = params.sign.replace('$SHA256', '');
    let public_key = params.publicKey;
    let sb = "";

    if (!result) {
      sb = "";
    } else {
      sb += result.trim();
    }

    sb = sb.replace(/[\s]{2,}/g, "");
    sb = sb.replace(/\n/g, "");
    sb = sb.replace(/[\s]/g, "");

    let r = public_key + "";
    let a = "-----BEGIN PUBLIC KEY-----";
    let b = "-----END PUBLIC KEY-----";
    public_key = "";
    let len = r.length;
    let start = 0;

    while (start <= len) {
      if (public_key.length) {
        public_key += r.substr(start, 64) + '\n';
      } else {
        public_key = r.substr(start, 64) + '\n';
      }
      start += 64;
    }

    public_key = a + '\n' + public_key + b;

    let verify = crypto.createVerify('RSA-SHA256');
    verify.update(sb);
    sign = sign + "";
    // sign = sign.substr(0,-7);
    sign = sign.replace(/[-]/g, '+');
    sign = sign.replace(/[_]/g, '/');
    let res = verify.verify(public_key, sign, 'base64');

    return res;
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
    let sb = "";

    if (!result) {
      sb = "";
    } else {
      sb += result;
    }

    let r = public_key + "";
    let a = "-----BEGIN PUBLIC KEY-----";
    let b = "-----END PUBLIC KEY-----";
    public_key = "";
    let len = r.length;
    let start = 0;

    while (start <= len) {
      if (public_key.length) {
        public_key += r.substr(start, 64) + '\n';
      } else {
        public_key = r.substr(start, 64) + '\n';
      }
      start += 64;
    }

    public_key = a + '\n' + public_key + b;

    let verify = crypto.createVerify('RSA-SHA256');
    verify.update(sb);
    sign = sign + "";
    // sign = sign.substr(0,-7);
    sign = sign.replace(/[-]/g, '+');
    sign = sign.replace(/[_]/g, '/');
    let res = verify.verify(public_key, sign, 'base64');

    return res;
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
    if (!format) {
      return content;
    }

    let local = -1;
    let result = "";
    let tmp_result = "";
    let length = 0;

    switch (format) {
      case 'json':
        local = content.indexOf('"result"');
        result = content.substr(local);
        length = tmp_result.length; // This seems wrong, tmp_result is empty
        result = result.substr(length + 3); // This logic seems flawed
        result = result.substr(0, result.lastIndexOf('"ts"'));
        result = result.substr(0, result.length - 4);
        return result;
      default:
        local = content.indexOf('"</state>"'); // This seems wrong, likely meant '</state>'
        result = content.substr(local);
        tmp_result = '</state>';
        length = tmp_result.length;
        result = result.substr(length + 4); // This logic seems flawed
        result = result.substr(0, result.lastIndexOf('"ts"'));
        result = result.substr(0, -2); // Negative index likely unintended
        return result;
    }
  }
}

export default VerifyUtils;