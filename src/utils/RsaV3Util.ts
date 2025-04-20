import { getUniqueId } from './GetUniqueId.js';
import { HttpUtils } from './HttpUtils.js';
import crypto from 'crypto';
import md5 from 'md5';
import { AuthHeaderOptions } from './types.js';

// Helper function for date formatting (replaces Date.prototype extension)
function formatDate(date: Date, fmt: string): string {
  const o: Record<string, number> = {
    "M+": date.getMonth() + 1,                 // Month
    "d+": date.getDate(),                      // Day
    "h+": date.getHours(),                     // Hour
    "m+": date.getMinutes(),                   // Minute
    "s+": date.getSeconds(),                   // Second
    "q+": Math.floor((date.getMonth() + 3) / 3), // Quarter
    "S": date.getMilliseconds()                // Millisecond
  };

  let formatString = fmt; // Use a local variable to avoid modifying the input parameter directly

  if (/(y+)/.test(formatString)) {
    formatString = formatString.replace(RegExp.$1, (date.getFullYear() + "").substr(4 - RegExp.$1.length));
  }

  for (const k in o) {
    if (new RegExp("(" + k + ")").test(formatString)) {
      const value = o[k]; // Get the value once
      formatString = formatString.replace(
        RegExp.$1,
        (RegExp.$1.length === 1) ?
          (value!.toString()) : // Assert non-null, as k is a valid key of o
          (("00" + value!).substr(("" + value!).length)) // Assert non-null here too
      );
    }
  }

  return formatString;
}


export class RsaV3Util {
  /**
   * Gets authentication headers for API requests
   * @param options - Options for generating auth headers
   * @returns Authentication headers
   */
  static getAuthHeaders(options: AuthHeaderOptions): Record<string, string> {
    const { appKey, method, url, params = {}, secretKey, config = { contentType: ''} } = options;

    // 修复：移除对 application/json 类型参数的额外处理
    // JSON 字符串应该保持原样，不应该对每个字段进行 normalize 处理

    const timestamp = formatDate(new Date(), "yyyy-MM-ddThh:mm:ssZ");
    const authString = 'yop-auth-v3/' + appKey + "/" + timestamp + "/1800";
    const HTTPRequestMethod = method;
    const CanonicalURI = url;
    const CanonicalQueryString = RsaV3Util.getCanonicalQueryString(params, method);

    // Define headers to be included in the signature
    const headersToSign: Record<string, string> = {
      'x-yop-appkey': appKey,
      'x-yop-content-sha256': RsaV3Util.getSha256AndHexStr(params, config, method),
      'x-yop-request-id': RsaV3Util.uuid(),
      // Add other headers here if they need to be signed, e.g., 'x-yop-date'
      // Add content-type if it exists in the config
      ...(config.contentType && { 'content-type': config.contentType }),
    };

    // Generate CanonicalHeaders and signedHeaders string according to YOP spec
    const { canonicalHeaderString, signedHeadersString } = RsaV3Util.buildCanonicalHeaders(headersToSign);

    const CanonicalRequest =
      authString + "\n" +
      HTTPRequestMethod + "\n" +
      CanonicalURI + "\n" +
      CanonicalQueryString + "\n" +
      canonicalHeaderString; // Use the correctly formatted canonical headers

    // Prepare all headers for the actual HTTP request
    const allHeaders: Record<string, string> = {
      ...headersToSign, // Include signed headers
      'x-yop-sdk-version': '0.2.5', // 根据实际使用的SDK版本调整
      'x-yop-sdk-lang': '@yeepay/yop-typescript-sdk',
      // Authorization header will be added after signing
    };


    // 使用提取的sign方法生成签名
    const signToBase64 = this.sign(CanonicalRequest, secretKey);

    // Construct auth header using the correctly generated signedHeadersString
    allHeaders.Authorization = "YOP-RSA2048-SHA256 " + authString + "/" +
      signedHeadersString + "/" + signToBase64; // Use signedHeadersString

    return allHeaders; // Return all necessary headers
  }

 static buildCanonicalHeaders(headersToSign: Record<string, string>): { canonicalHeaderString: string; signedHeadersString: string } {
    const canonicalEntries: string[] = [];
    const signedHeaderNames: string[] = [];

    // Normalize, sort, and format all provided headers according to YOP spec
    Object.keys(headersToSign)
      .map(key => key.toLowerCase()) // Convert keys to lowercase for sorting and processing
      .filter(key => key.startsWith('x-yop-')) // 只包含 x-yop- 开头的头部
      .sort() // Sort keys alphabetically
      .forEach(lowerCaseKey => {
        // Find the original key to get the original value
        const originalKey = Object.keys(headersToSign).find(k => k.toLowerCase() === lowerCaseKey);
        if (originalKey === undefined) return; // Should not happen, but safety check

        const value = headersToSign[originalKey]?.trim() ?? ''; // Get value, trim whitespace

        // URL-encode both the lowercase name and the trimmed value as per documentation
        const encodedName = HttpUtils.normalize(lowerCaseKey);
        const encodedValue = HttpUtils.normalize(value);

        canonicalEntries.push(`${encodedName}:${encodedValue}`);
        signedHeaderNames.push(lowerCaseKey); // signedHeadersString uses lowercase names *before* encoding
      });

    const canonicalHeaderString = canonicalEntries.join('\n');
    const signedHeadersString = signedHeaderNames.join(';');

    return { canonicalHeaderString, signedHeadersString };
  }


  /**
   * Gets canonical query string for API requests
   * @param params - Request parameters
   * @param method - HTTP method
   * @returns Canonical query string
   */
  static getCanonicalQueryString(params: Record<string, unknown>, method: string): string {
    if (method.toLowerCase() === 'post') return '';
    if (Object.keys(params).length === 0) return '';
    return this.getCanonicalParams(params);
  }

  /**
   * Gets canonical headers for API requests
   * @param headers - Request headers
   * @returns Canonical headers string
   */
  // This function is now replaced by buildCanonicalHeaders and can be removed or kept for reference
  // static getCanonicalHeaders(headers: Record<string, string>): string {
  //   const hArray: string[] = [];
  //   Object.keys(headers).forEach(key => {
  //     hArray.push(key + ':' + headers[key]);
  //   });
  //   return hArray.join('\n');
  // }

  /**
   * Generates a UUID
   * @returns UUID string
   */
  static uuid(): string {
    const char = getUniqueId(24) + "" + new Date().getTime();
    const hash = md5(char);
    let uuid = "";
    uuid += hash.substr(0, 8) + '-';
    uuid += hash.substr(8, 4) + '-';
    uuid += hash.substr(12, 4) + '-';
    uuid += hash.substr(16, 4) + '-';
    uuid += hash.substr(20, 12);
    return uuid;
  }

  /**
   * Gets canonical parameters string
   * @param params - Request parameters
   * @param type - Content type
   * @returns Canonical parameters string
   */
  static getCanonicalParams(params: Record<string, unknown> = {}, type?: string): string {
    const paramStrings: string[] = [];

    for (const key in params) {
      let value = params[key];

      if (!key) {
        continue;
      }

      if (!value) {
        value = "";
      }

      const normalizedKey = HttpUtils.normalize(key.trim());
      let normalizedValue;
      
      // 对于 form-urlencoded 类型，需要对值进行双重编码
      if (type === 'application/x-www-form-urlencoded') {
        // 先对值进行一次编码
        const firstNormalized = HttpUtils.normalize((value as any)?.toString());
        // 然后对编码后的值再进行一次编码
        normalizedValue = firstNormalized.replace(/%/g, '%25');
      } else {
        // 对于其他类型，只进行一次编码
        normalizedValue = HttpUtils.normalize((value as any)?.toString());
      }

      paramStrings.push(normalizedKey + '=' + normalizedValue);
    }

    paramStrings.sort();

    let strQuery = "";
    for (const i in paramStrings) {
      const kv = paramStrings[i];
      strQuery += strQuery.length === 0 ? "" : "&";
      strQuery += kv;
    }

    return strQuery;
  }

  /**
   * Calculates SHA256 hash and returns hex string
   * @param params - Request parameters
   * @param config - Configuration options
   * @param method - HTTP method
   * @returns SHA256 hash as hex string
   */
  /**
   * 对对象的键进行排序，以确保生成一致的 JSON 字符串
   * @param obj - 要排序的对象
   * @returns 排序后的对象
   */
  private static sortObjectKeys(obj: Record<string, unknown>): Record<string, unknown> {
    if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
      return obj as Record<string, unknown>;
    }
    
    const sortedObj: Record<string, unknown> = {};
    const keys = Object.keys(obj).sort();
    
    for (const key of keys) {
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        // 递归排序嵌套对象
        sortedObj[key] = this.sortObjectKeys(obj[key] as Record<string, unknown>);
      } else {
        sortedObj[key] = obj[key];
      }
    }
    
    return sortedObj;
  }

  /**
   * Calculates SHA256 hash and returns hex string
   * @param params - Request parameters
   * @param config - Configuration options
   * @param method - HTTP method
   * @returns SHA256 hash as hex string
   */
  static getSha256AndHexStr(
    params: Record<string, unknown>,
    config: { contentType: string },
    method: string
  ): string {
    let str = '';

    if (config.contentType.includes('application/json') && method.toLowerCase() === 'post') {
      // 对 JSON 对象的键进行排序，以确保生成一致的 JSON 字符串
      const sortedParams = this.sortObjectKeys(params);
      str = JSON.stringify(sortedParams);
    } else {
      if (Object.keys(params).length !== 0) {
        str = this.getCanonicalParams(params);
      }
    }

    const sign = crypto.createHash('SHA256');
    sign.update(str, 'utf8');
    const sig = sign.digest('hex');

    return sig;
  }

  /**
   * Signs a canonical request string using RSA-SHA256
   * @param canonicalRequest - The canonical request string to sign
   * @param secretKey - The private key to sign with (PEM format or raw)
   * @returns Base64 URL-safe signature with $SHA256 suffix
   */
  static sign(canonicalRequest: string, secretKey: string): string {
    // Check if secretKey is already in PEM format
    const private_key = secretKey.includes('-----BEGIN PRIVATE KEY-----')
      ? secretKey
      : this.formatPrivateKey(secretKey);
    
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(canonicalRequest, 'utf8');
    let sig = signer.sign(private_key, 'base64');

    // URL safe processing
    sig = sig.replace(/[+]/g, '-');
    sig = sig.replace(/[/]/g, '_');

    // Remove extra '=' padding
    sig = sig.replace(/=+$/, ''); // More efficient regex to remove trailing '='

    // Add algorithm suffix
    return sig + '$SHA256';
  }

  /**
   * Formats a raw private key string into PEM format
   * @param rawKey - The raw private key string
   * @returns Formatted PEM private key
   */
  private static formatPrivateKey(rawKey: string): string {
    const BEGIN_MARKER = "-----BEGIN PRIVATE KEY-----";
    const END_MARKER = "-----END PRIVATE KEY-----";
    let formattedKey = "";
    const len = rawKey.length;
    let start = 0;

    while (start <= len) {
      if (formattedKey.length) {
        formattedKey += rawKey.substr(start, 64) + '\n';
      } else {
        formattedKey = rawKey.substr(start, 64) + '\n';
      }
      start += 64;
    }

    return BEGIN_MARKER + '\n' + formattedKey + END_MARKER;
  }
}

export default RsaV3Util;