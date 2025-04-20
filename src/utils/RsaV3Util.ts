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

    if (config.contentType === 'application/json') {
      for (const key in params) {
        // Cast params[key] to any as HttpUtils.normalize is designed to handle various input types
        params[key] = HttpUtils.normalize(params[key] as any);
      }
    }

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
      'x-yop-sdk-version': '0.2.1', // 根据实际使用的SDK版本调整
      'x-yop-sdk-lang': '@yeepay/yop-typescript-sdk',
      // Authorization header will be added after signing
    };


    let r = secretKey;
    const a = "-----BEGIN PRIVATE KEY-----";
    const b = "-----END PRIVATE KEY-----";
    let private_key = "";
    const len = r.length;
    let start = 0;

    while (start <= len) {
      if (private_key.length) {
        private_key += r.substr(start, 64) + '\n';
      } else {
        private_key = r.substr(start, 64) + '\n';
      }
      start += 64;
    }

    private_key = a + '\n' + private_key + b;
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(CanonicalRequest);
    let sig = sign.sign(private_key, 'base64');

    // URL safe processing
    sig = sig.replace(/[+]/g, '-');
    sig = sig.replace(/[/]/g, '_');

    // Remove extra '=' padding
    sig = sig.replace(/=+$/, ''); // More efficient regex to remove trailing '='

    let signToBase64 = sig;
    signToBase64 += '$SHA256';

    // Construct auth header using the correctly generated signedHeadersString
    allHeaders.Authorization = "YOP-RSA2048-SHA256 " + authString + "/" +
      signedHeadersString + "/" + signToBase64; // Use signedHeadersString

    return allHeaders; // Return all necessary headers
  }

 static buildCanonicalHeaders(headersToSign: Record<string, string>): { canonicalHeaderString: string; signedHeadersString: string } {
    const canonicalEntries: string[] = [];
    const signedHeaderNames: string[] = [];

    // Normalize, sort, and format headers
    Object.keys(headersToSign)
      .map(key => key.toLowerCase()) // Convert keys to lowercase
      .sort() // Sort keys alphabetically
      .forEach(lowerCaseKey => {
        const originalKey = Object.keys(headersToSign).find(k => k.toLowerCase() === lowerCaseKey)!; // Find original case key
        const value = headersToSign[originalKey]?.trim() ?? ''; // Get value, trim whitespace
        canonicalEntries.push(`${lowerCaseKey}:${value}`);
        signedHeaderNames.push(lowerCaseKey);
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
      let normalizedValue: string;

      if (type === 'form-urlencoded') {
        // Cast value to any as HttpUtils.normalize is designed to handle various input types
        normalizedValue = HttpUtils.normalize(HttpUtils.normalize(value as any));
      } else {
        // Cast value to any as HttpUtils.normalize is designed to handle various input types
        // Note: normalize itself calls toString() if value is not null/undefined
        normalizedValue = HttpUtils.normalize((value as any)?.toString().trim()); // Added optional chaining for safety before trim
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
  static getSha256AndHexStr(
    params: Record<string, unknown>,
    config: { contentType: string },
    method: string
  ): string {
    let str = '';

    if (config.contentType.includes('application/json') && method.toLowerCase() === 'post') {
      str = JSON.stringify(params);
    } else {
      if (Object.keys(params).length !== 0) {
        str = this.getCanonicalParams(params);
      }
    }

    const sign = crypto.createHash('SHA256');
    sign.update(str);
    const sig = sign.digest('hex');

    return sig;
  }
}

export default RsaV3Util;