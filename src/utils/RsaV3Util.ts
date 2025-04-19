import { getUniqueId } from './GetUniqueId.js';
import { HttpUtils } from './HttpUtils.js';
import crypto from 'crypto';
import md5 from 'md5';
import { AuthHeaderOptions } from './types.js';

// Extend Date prototype with Format method
declare global {
  interface Date {
    Format(fmt: string): string;
  }
}

Date.prototype.Format = function (fmt: string): string {
  const o: Record<string, number> = {
    "M+": this.getMonth() + 1,                 // Month
    "d+": this.getDate(),                      // Day
    "h+": this.getHours(),                     // Hour
    "m+": this.getMinutes(),                   // Minute
    "s+": this.getSeconds(),                   // Second
    "q+": Math.floor((this.getMonth() + 3) / 3), // Quarter
    "S": this.getMilliseconds()                // Millisecond
  };

  if (/(y+)/.test(fmt)) {
    fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
  }

  for (const k in o) {
    if (new RegExp("(" + k + ")").test(fmt)) {
      fmt = fmt.replace(
        RegExp.$1,
        (RegExp.$1.length === 1) ?
          (o[k].toString()) :
          (("00" + o[k]).substr(("" + o[k]).length))
      );
    }
  }

  return fmt;
};

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
        params[key] = HttpUtils.normalize(params[key]);
      }
    }

    const timestamp = new Date().Format("yyyy-MM-ddThh:mm:ssZ");
    const authString = 'yop-auth-v3/' + appKey + "/" + timestamp + "/1800";
    const HTTPRequestMethod = method;
    const CanonicalURI = url;
    const CanonicalQueryString = RsaV3Util.getCanonicalQueryString(params, method);

    // v3 signature headers, ordered!!!
    const headers: Record<string, string> = {
      'x-yop-appkey': appKey,
      'x-yop-content-sha256': RsaV3Util.getSha256AndHexStr(params, config, method), // Include SHA256 hash of body
      'x-yop-request-id': RsaV3Util.uuid(),
    };

    const CanonicalHeaders = RsaV3Util.getCanonicalHeaders(headers);
    const CanonicalRequest =
      authString + "\n" +
      HTTPRequestMethod + "\n" +
      CanonicalURI + "\n" +
      CanonicalQueryString + "\n" +
      CanonicalHeaders;

    const signedHeaders = 'x-yop-appkey;x-yop-content-sha256;x-yop-request-id'; // Must match headers included in CanonicalHeaders

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

    // Remove extra '='
    let sig_len = sig.length;
    let find_len = 0;
    let start_len = sig_len - 1;

    while (true) {
      if (sig.substr(start_len, 1) === "=") {
        find_len++;
        start_len--;
        continue;
      }
      break;
    }

    sig = sig.substr(0, sig_len - find_len);
    let signToBase64 = sig;
    signToBase64 += '$SHA256';

    // Construct auth header
    headers.Authorization = "YOP-RSA2048-SHA256 " + authString + "/" +
      signedHeaders + "/" + signToBase64;

    return headers;
  }

  /**
   * Gets canonical query string for API requests
   * @param params - Request parameters
   * @param method - HTTP method
   * @returns Canonical query string
   */
  static getCanonicalQueryString(params: Record<string, any>, method: string): string {
    if (method.toLowerCase() === 'post') return '';
    if (Object.keys(params).length === 0) return '';
    return this.getCanonicalParams(params);
  }

  /**
   * Gets canonical headers for API requests
   * @param headers - Request headers
   * @returns Canonical headers string
   */
  static getCanonicalHeaders(headers: Record<string, string>): string {
    const hArray: string[] = [];
    Object.keys(headers).forEach(key => {
      hArray.push(key + ':' + headers[key]);
    });
    return hArray.join('\n');
  }

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
  static getCanonicalParams(params: Record<string, any> = {}, type?: string): string {
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
        normalizedValue = HttpUtils.normalize(HttpUtils.normalize(value));
      } else {
        normalizedValue = HttpUtils.normalize(value.toString().trim());
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
    params: Record<string, any>,
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