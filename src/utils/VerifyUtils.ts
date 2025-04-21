import crypto from 'crypto';
import URLSafeBase64 from 'urlsafe-base64';

interface VerifyParams {
  data: string;
  sign: string;
  publicKey: string | Buffer | crypto.KeyObject; // Allow KeyObject input
}

interface DigitalEnvelopeResult {
  status: 'success' | 'failed';
  result: string;
  message: string;
}

export class VerifyUtils {
  /**
   * Creates a KeyObject from various public key/certificate inputs.
   * Handles PEM Public Key blocks that actually contain certificates.
   * @param certOrKey - Certificate content (PEM), PEM public key (potentially containing a cert), or raw public key string/Buffer.
   * @returns The public key as a KeyObject.
   * @throws Error if input is invalid or public key cannot be extracted/created.
   */
  static getPublicKeyObject(certOrKey: string | Buffer): crypto.KeyObject {
    // Removed check for existing KeyObject, function expects string or Buffer input
    try {
      const keyString = Buffer.isBuffer(certOrKey) ? certOrKey.toString('utf-8').trim() : String(certOrKey).trim();

      // 1. Handle standard X.509 Certificate PEM
      if (keyString.startsWith('-----BEGIN CERTIFICATE-----') && keyString.endsWith('-----END CERTIFICATE-----')) {
        try {
          const cert = new crypto.X509Certificate(keyString);
          const publicKeyObject = cert.publicKey;
          if (!publicKeyObject) {
              throw new Error('Public key not found within certificate.');
          }
          return publicKeyObject;
        } catch (error) {
          console.error(`Failed to parse standard certificate PEM: ${error instanceof Error ? error.message : String(error)}`);
          throw new Error(`Invalid certificate format: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // 2. Handle PEM blocks starting with -----BEGIN PUBLIC KEY-----
      if (keyString.startsWith('-----BEGIN PUBLIC KEY-----') && keyString.endsWith('-----END PUBLIC KEY-----')) {
         // First, try to parse directly as a public key (SPKI/PKCS#1)
         try {
             return crypto.createPublicKey({
                 key: keyString,
                 format: 'pem'
             });
         } catch (directPublicKeyError) {
             // If direct parsing fails, assume it might be a cert disguised as a public key PEM
             console.warn(`[VerifyUtils] Direct parsing of PUBLIC KEY PEM failed (${directPublicKeyError instanceof Error ? directPublicKeyError.message : String(directPublicKeyError)}). Attempting to parse as certificate...`);
             try {
                 // Temporarily replace headers to parse as certificate
                 const certString = keyString.replace('-----BEGIN PUBLIC KEY-----', '-----BEGIN CERTIFICATE-----')
                                             .replace('-----END PUBLIC KEY-----', '-----END CERTIFICATE-----');
                 const cert = new crypto.X509Certificate(certString);
                 const publicKeyObject = cert.publicKey;
                 if (!publicKeyObject) {
                     throw new Error('Public key not found within certificate disguised as PUBLIC KEY PEM.');
                 }
                 console.info("[VerifyUtils] Successfully extracted public key from certificate disguised as PUBLIC KEY PEM.");
                 return publicKeyObject;
             } catch (certParseError) {
                 console.error(`Failed to parse PUBLIC KEY PEM block as certificate: ${certParseError instanceof Error ? certParseError.message : String(certParseError)}`);
                 // Throw a combined error message
                 throw new Error(`Invalid PUBLIC KEY PEM format. Direct parsing failed: ${directPublicKeyError instanceof Error ? directPublicKeyError.message : String(directPublicKeyError)}. Certificate parsing also failed: ${certParseError instanceof Error ? certParseError.message : String(certParseError)}`);
             }
         }
      }

      // 3. Handle raw key string (less likely for YOP)
      console.warn("[VerifyUtils] Input is not a standard PEM Certificate or Public Key. Attempting to format as raw key PEM.");
      const cleanKey = keyString.replace(/\s+/g, '');
      if (!cleanKey) {
          throw new Error("Provided public key string is empty or invalid.");
      }
      let formattedKey = '';
      for (let i = 0; i < cleanKey.length; i += 64) {
        formattedKey += cleanKey.substring(i, i + 64) + '\n';
      }
      const pemKeyString = `-----BEGIN PUBLIC KEY-----\n${formattedKey}-----END PUBLIC KEY-----`;
       try {
          return crypto.createPublicKey({
              key: pemKeyString,
              format: 'pem'
          });
      } catch (error) {
           console.error(`Failed to create public key object from formatted raw key PEM: ${error instanceof Error ? error.message : String(error)}`);
           console.error("Problematic PEM string from raw key:\n", pemKeyString);
           throw new Error(`Failed to create public key object from formatted raw key PEM: ${error instanceof Error ? error.message : String(error)}`);
      }

    } catch (error) {
      // Catch errors from the outer try block or re-thrown errors
      console.error(`Error processing public key/certificate input in getPublicKeyObject: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Validates RSA signature for YOP API responses.
   * Assumes the signature should be verified against the string representation of the 'result' field in the JSON response.
   * @param params - Parameters containing the full response body string (data), the signature (sign), and the public key.
   * @returns Whether the signature is valid.
   */
  static isValidRsaResult(params: VerifyParams): boolean {
    try {
      let sign = params.sign.replace('$SHA256', '');
      const fullResponseBody = params.data ?? "";
      let dataToVerify : string; // String used for verification

      // 1. Parse the full response body and extract the 'result' field's string representation
      try {
          const parsedResponse = JSON.parse(fullResponseBody);
          if (typeof parsedResponse === 'object' && parsedResponse !== null && 'result' in parsedResponse) {
              const resultField = parsedResponse.result;
              // Stringify the result field for verification
              // NOTE: Simple JSON.stringify might not be canonical if key order matters.
              // YOP Java SDK might use a specific canonical JSON stringifier.
              // If this fails, a more robust canonical JSON stringification might be needed.
              if (typeof resultField === 'string') {
                  dataToVerify = resultField; // Use directly if result is already a string
              } else if (resultField === null || resultField === undefined) {
                  dataToVerify = ""; // Use empty string if result is null/undefined
              }
              else {
                  dataToVerify = JSON.stringify(resultField); // Stringify if object/array/etc.
              }
              console.info("[VerifyUtils] Verifying signature against 'result' field string:", dataToVerify);
          } else {
              console.warn("[VerifyUtils] 'result' field not found in the parsed response body. Verifying against full body as fallback.");
              dataToVerify = fullResponseBody; // Fallback to full body if 'result' not found
          }
      } catch (e) {
          console.error("[VerifyUtils] Failed to parse response body as JSON for verification.", e);
          return false; // Cannot verify if JSON parsing fails
      }

      // 2. Get the public key object
      let publicKeyObject: crypto.KeyObject;
      try {
        const keyInput = (typeof params.publicKey === 'object' && 'export' in params.publicKey)
                         ? params.publicKey.export({format: 'pem', type: 'spki'})
                         : params.publicKey;
        publicKeyObject = this.getPublicKeyObject(keyInput as string | Buffer);
      } catch (error) {
        return false;
      }

      // 3. Perform verification
      let verify = crypto.createVerify('RSA-SHA256');
      verify.update(dataToVerify); // Use the extracted result string
      sign = sign + "";
      sign = sign.replace(/[-]/g, '+');
      sign = sign.replace(/[_]/g, '/');

      let res = verify.verify(publicKeyObject, sign, 'base64');

      if (!res) {
          console.warn("[VerifyUtils] RSA Result Verification Failed. Data verified:", dataToVerify);
          console.warn("[VerifyUtils] Signature:", sign);
          // console.warn("[VerifyUtils] Public Key used:", publicKeyObject.export({format:'pem', type:'spki'})); // Uncomment for deep debug
      }

      return res;
    } catch (error) {
      console.error(`Error during RSA result verification: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Extracts result from response string (Potentially deprecated or needs context)
   * @param str - Response string
   * @returns Extracted result
   */
  static getResult(str: string): string {
    const match = str.match(/"result"\s*:\s*({.*}),\s*"ts"/s);
    return match ? (match[1] ?? '') : '';
  }

  /**
   * Handles digital envelope decryption
   * @param content - Digital envelope content
   * @param isv_private_key - Merchant private key
   * @param yop_public_key - YOP platform public key (string, Buffer, or KeyObject)
   * @returns Processing result
   */
  static digital_envelope_handler(
    content: string,
    isv_private_key: string,
    yop_public_key: string | Buffer | crypto.KeyObject // Allow KeyObject
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
        const encryted_key_safe = this.base64_safe_handler(digital_envelope_arr[0] ?? '');
        // Ensure private key is in correct PEM format for decryption
        const formattedPrivateKey = isv_private_key.includes('-----BEGIN PRIVATE KEY-----')
            ? isv_private_key
            : this.key_format(isv_private_key);
        const decryted_key = this.rsaDecrypt(encryted_key_safe, formattedPrivateKey);

        const biz_param_arr = this.aesDecrypt(
          this.base64_safe_handler(digital_envelope_arr[1] ?? ''),
          decryted_key
        ).split('$');

        const sign = biz_param_arr.pop() || '';
        event.result = biz_param_arr.join('$');

        // Pass the public key directly to isValidNotifyResult
        if (this.isValidNotifyResult(event.result, sign, yop_public_key)) {
          event.status = 'success';
        } else {
          event.message = '验签失败'; // isValidNotifyResult will log specific errors
        }
      } catch (error) {
         console.error(`Error during digital envelope handling: ${error instanceof Error ? error.message : String(error)}`);
        event.message = `数字信封处理失败: ${error instanceof Error ? error.message : String(error)}`;
      }
    }

    return event;
  }

  /**
   * Validates merchant notification signature (or similar signed data)
   * @param result - Result data string to verify
   * @param sign - Signature
   * @param public_key - Public key (string, Buffer, or KeyObject)
   * @returns Whether the signature is valid
   */
  static isValidNotifyResult(result: string, sign: string, public_key: string | Buffer | crypto.KeyObject): boolean {
     try {
      let dataToVerify = result ?? "";

      let publicKeyObject: crypto.KeyObject;
      try {
         // Ensure public_key is string or Buffer before passing
         const keyInput = (typeof public_key === 'object' && 'export' in public_key)
                          ? public_key.export({format: 'pem', type: 'spki'})
                          : public_key;
         publicKeyObject = this.getPublicKeyObject(keyInput as string | Buffer);
      } catch (error) {
         // Error already logged in getPublicKeyObject
        return false; // Cannot proceed without a valid key object
      }

      let verify = crypto.createVerify('RSA-SHA256');
      verify.update(dataToVerify);
      sign = sign + "";
      sign = sign.replace(/[-]/g, '+');
      sign = sign.replace(/[_]/g, '/');

      // Use the obtained KeyObject for verification
      let res = verify.verify(publicKeyObject, sign, 'base64');

      return res;
    } catch (error) {
      console.error(`Error during Notify result verification: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  // --- Helper methods ---

  static base64_safe_handler(data: string): string {
    return URLSafeBase64.decode(data).toString('base64');
  }

  static key_format(key: string): string {
    // Ensure the key is trimmed and properly formatted
    const trimmedKey = key.trim();
    if (trimmedKey.startsWith('-----BEGIN PRIVATE KEY-----')) {
        return trimmedKey; // Already formatted
    }
    // Format raw key
    let formattedKey = '';
    const len = trimmedKey.length;
    let start = 0;
    while (start < len) { // Use < instead of <=
        formattedKey += trimmedKey.substr(start, 64) + '\n';
        start += 64;
    }
    return '-----BEGIN PRIVATE KEY-----\n' + formattedKey + '-----END PRIVATE KEY-----';
  }

  static rsaDecrypt(content: string, privateKey: string): Buffer {
    const block = Buffer.from(content, 'base64');
    const decodeData = crypto.privateDecrypt(
      {
        key: privateKey, // Assumes privateKey is correctly PEM formatted by key_format
        padding: crypto.constants.RSA_PKCS1_PADDING
      },
      block
    );
    return decodeData;
  }

  static aesDecrypt(encrypted: string, key: Buffer): string {
    const decipher = crypto.createDecipheriv('aes-128-ecb', key, Buffer.alloc(0));
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  static getBizResult(content: string, format?: string): string {
    if (!format) {
      return content;
    }
    let local: number;
    let result: string;
    switch (format) {
      case 'json':
        local = content.indexOf('"result"');
        if (local === -1) return "";
        const openBraceIndex = content.indexOf('{', local + 8);
        if (openBraceIndex === -1) return "";
        const closingPartIndex = content.lastIndexOf('},"ts"');
        if (closingPartIndex === -1 || closingPartIndex < openBraceIndex) return "";
        result = content.substring(openBraceIndex, closingPartIndex + 1);
        try {
          JSON.parse(result);
          return result;
        } catch (e) {
          console.error("Extracted 'result' is not valid JSON in getBizResult:", result);
          return "";
        }
      default:
        local = content.indexOf('</state>');
        if (local === -1) return "";
        const startIndex = local + '</state>'.length;
        const endIndex = content.lastIndexOf(',"ts"');
        if (endIndex === -1 || endIndex <= startIndex) return "";
        result = content.substring(startIndex, endIndex).trim();
        return result;
    }
  }
}

export default VerifyUtils;