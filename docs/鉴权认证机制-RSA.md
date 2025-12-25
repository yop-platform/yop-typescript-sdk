# 鉴权认证机制(RSA)

本文适合的阅读人群

* YOP 平台开发者
* YOP SDK 编写者

## 一、鉴权认证串Authorization

```json
Authorization: securityReq authString/signedHeaders/signature
```

鉴权认证串``Authorization``示例：

```text
RSA算法：
Authorization: YOP-RSA2048-SHA256 yop-auth-v3/app_100123456789/2021-12-08T11:59:16Z/1800/content-type;x-yop-appkey;x-yop-content-sha256;x-yop-request-id/pOVoj1mI5bqYQQKTlE8iIYm0DKHpL5Q2vscY03lwP3KXpHRPJlKQfEOgpW-jfsyWf46c-uPehOZfOke7vla3rY6FtAVeoX0g8319WEdvQVgXwzW7xPtp5er4No8gpCrizsbmp2Fw7NSjASGsCaLEEri8iHsvN_TgFsGEIUf9JtQYWkoqdOh6vK1-xZvisp2ePAg2GKHy1Y0tbkXbzO9Bp_dBkgEHI7B2N80mzn-tEZ0xi6uMKSSvI8VPK14Rys8pJ4c4I4RZjoDEnxxsG2Z977RGtCuf_3RvrwohxECO5iF8BMjJF89nqi50QaZtS2mx32649_cORFLbD8VFpQhyxA$SHA256
```

### 1、安全需求securityReq

YOP支持的安全需求``securityReq``：

- YOP-RSA2048-SHA256

### 2、认证字符串authString

&lt;span id="test2"&gt;认证字符串authString&lt;/span&gt;，由协议版本``protocolVersion``、应用标识``appKey``、日期值``timestamp``和签名有效时长``expiredSeconds``组成。
确保 YOP 平台在收到请求时能使用相同的签名协议并匹配您计算出的签名且在有效期内。否则，您的请求将被拒绝。

```json
authString: protocolVersion/appKey/timestamp/expiredSeconds
```

示例：

```text
authString: yop-auth-v3/app_100123456789/2021-12-08T11:59:16Z/1800
```

#### a、协议版本protocolVersion，以'/'结尾

目前固定为``yop-auth-v3``，以'/'结尾：

```text
yop-auth-v3/
```

#### b、应用标识appKey，以'/'结尾

您的``appKey``，以'/'结尾如：

```text
app_100123456789/
```

#### c、日期值timestamp，以'/'结尾

日期值``timestamp``遵循 ISO8601 基本格式，即``yyyy-MM-ddTHH:mm:ssZ``，以'/'结尾。该日期值``timestamp``必须与您在所有步骤中使用的值保持一致，比如``x-yop-date``标头。

```text
2021-12-08T11:59:16Z/
```

#### d、签名有效时长expiredSeconds

单位为秒，无需以'/'结尾如：

```text
1800
```

### 3、签名头signedHeaders

签名头``signedHeaders``由规范标头``canonicalHeaders``中的标头名称列表组成。签名头``signedHeaders``的作用是，告知 YOP 平台请求中的哪些标头是签名过程的一部分。
以下是签名头``signedHeaders``的伪代码格式。Lowercase 表示将所有字符转换为小写字母的函数。Sort 表示按照标头名称的 ASCII 顺序对所有标头进行升序排序。多个标头名称以';'分隔，结尾处不加';'。

```json
signedHeaders: Sort(Lowercase(HeaderName0);Lowercase(HeaderName1); ... Lowercase(HeaderNameN))
```

示例：

```json
signedHeaders: content-type;x-yop-appkey;x-yop-content-sha256;x-yop-request-id
```

### 4、签名signature

签名``signature``，由商户私钥``isvPrivateKey``、规范请求``canonicalRequest``和签名算法``SIGNER``生成。其中，签名算法``SIGNER``通常为 `SHA256withRSA`算法。
签名过程是，商户用摘要算法对规范请求``canonicalRequest``生成摘要，然后用自己的私钥对这个摘要进行加密，得到的就是签名``signature``。伪代码如下：

```json
signature: SIGNER(isvPrivateKey, canonicalRequest)
```

#### a、规范请求canonicalRequest

规范请求``canonicalRequest``，由认证字符串``authString``、Http请求方法``httpRequestMethod``、规范URI``canonicalURI``、规范查询字符串``canonicalQueryString``和规范标头``canonicalHeaders``组成。用于生成摘要。

```json
canonicalRequest: 
   authString + "\n" +
   httpRequestMethod + "\n" +
   canonicalURI + "\n" +
   canonicalQueryString + "\n" +
   canonicalHeaders
```

示例：

```text
canonicalRequest: 
yop-auth-v3/app_100123456789/2021-12-08T11:59:16Z/1800
POST
/rest/v1.0/trade/order

content-type:application%2Fx-www-form-urlencoded%3B%20charset%3Dutf-8
x-yop-appkey:app_100123456789
x-yop-content-sha256:d9c89c72b774c89e2d15c19fc3326e7c9508d605a7974ab0a636d9121c97e7ff
x-yop-request-id:d48782ac-93c1-466e-b417-f7a71e4965f0
```

##### ① 认证字符串authString，以'\n'换行符结尾

[见上文](#test2)，以'\n'换行符结尾，示例：

```json
yop-auth-v3/app_100123456789/2021-12-08T11:59:16Z/1800 + "\n"
```

##### ② Http请求方法httpRequestMethod，以'\n'换行符结尾

Http请求方法``httpRequestMethod``，分为``POST``和``GET``两种方式。以'\n'换行符结尾，示例：

```json
POST + "\n"
```

##### ③ 规范URI canonicalURI，以'\n'换行符结尾

规范URI``canonicalURI``，是 API 的请求路径。以'\n'换行符结尾，示例：

```json
/rest/v2.0/opr/queryorder + "\n"
```

##### ④ 规范查询字符串canonicalQueryString，以'\n'换行符结尾

针对``GET``请求，或者``POST``请求且内容类型为``json``，规范查询字符串``canonicalQueryString``遵循 RFC 3986，构建步骤如下：

1. 对每个参数名称key 和参数值value 进行 URL 编码；
2. 用'='拼接 URL 编码后的参数名称key 和参数值value，如果参数没有参数值value，value为空字符串。例如：urlencode(key1)=urlencode(value1)，urlencode(key2)=urlencode(value2)；
3. 按照参数名称key 的 ASCII 顺序，对拼接后的参数对进行升序排序Sort。例如，以大写字母 F（ASCII 代码 70，10进制）开头的参数名称key 排在以小写字母 b（ASCII 代码 98，10进制）开头的参数名称key 之前；
4. 用'&'拼接排序后的多个参数对，最后一个参数对后面无需拼接'&'。

**注意：**

- 如果请求没有URL查询字符串(比如`json`类型请求，通常只会在请求体放参数，不会放在url上)，则规范查询字符串``canonicalQueryString``为空字符串。
- 针对``POST``请求，且内容类型为``form``，即``application/x-www-form-urlencoded``或者``multipart/form-data``的请求，规范查询字符串``canonicalQueryString``一律为空字符串。
- 不同编程语言对空格URL编码结果不一样，须统一转为`20%`

规范查询字符串``canonicalQueryString``伪代码如下，以'\n'换行符结尾：

```json
Sort(urlencode(key1)=urlencode(value1)&urlencode(key2)=urlencode(value2)&...&urlencode(keyN)=urlencode(valueN)) + "\n"
```

##### ⑤ 规范标头canonicalHeaders

规范标头``canonicalHeaders``，由 HTTP 请求头中标头名称和标头值拼接组成。标头必须包含 ``x-yop-appkey``、``x-yop-request-id``、``x-yop-content-sha256``。
以下是规范标头 ``canonicalHeaders``的伪代码格式。urlencode 表示 URL 编码。Lowercase 表示将所有字符转换为小写字母的函数。Trimall 表示删除前后的多余空格并将连续空格转换为单个空格。Sort 表示按照标头名称的 ASCII 顺序对所有标头进行升序排序。标头名称和标头值以':'拼接，每个标头后面拼接'\n'，最后一个标头后面无需拼接'\n'。

```json
Sort(urlencode(Lowercase(Trimall(HeaderName0))) + ":" + urlencode(Trimall(HeaderValue0)) + "\n" +
urlencode(Lowercase(Trimall(HeaderName1))) + ":" + urlencode(Trimall(HeaderValue1)) + "\n" +
...
urlencode(Lowercase(Trimall(HeaderNameN))) + ":" + urlencode(Trimall(HeaderValueN)))
```

其中，``x-yop-content-sha256``由请求参数组成，构建步骤如下：

1. 构建请求参数字符串A
  针对``GET``请求，请求参数字符串A 为空字符串。
  针对``POST``请求，且内容类型为``json``，请求参数字符串A 为``json``字符串。
  对于``POST``请求，且内容类型为``form``，规则如下：
  a. 拼接非文件类型的参数键值对，对每个参数名称key 和参数值value 进行 URL 编码；
  b. 用'='拼接 URL 编码后的参数名称key 和参数值value。如果参数没有参数值value，value为空字符串。例如：urlencode(key1)=urlencode(value1)，urlencode(key2)=urlencode(value2)；
  c. 按照参数名称key 的 ASCII 顺序，对拼接后的参数对进行升序排序Sort。例如，以大写字母 F（ASCII 代码 70，10进制）开头的参数名称key 排在以小写字母 b（ASCII 代码 98，10进制）开头的参数名称key 之前；
  d. 用'&'拼接排序后的多个参数对，最后一个参数对后面无需拼接'&'。
2. 用 sha256算法对请求参数字符串A 计算摘要，并转为 hex值。伪代码为``hex(sha256(A))``

注意：

- 不同编程语言对空格URL编码结果不一样，须统一转为`20%`

示例：
原始标头：

```text
Host:openapi.yeepay.com\n
Content-Type:application/x-www-form-urlencoded; charset=utf-8\n
My-header1:    a   b   c  \n
X-Yop-Appkey:app_10012481831\n
X-Yop-Date:20170124T021133Z\n
x-yop-session-id:01e447af-9749-4075-8e6c-17df519f2720\n
My-Header2:    "a   b   c"  \n
```

规范标头 ``canonicalHeaders``：

```text
content-type:application%2Fx-www-form-urlencoded%3B%20charset%3Dutf-8\n
host:openapi.yeepay.com\n
my-header1:a b c\n
my-header2:"a b c"\n
x-yop-appkey:app_10012481831\n
x-yop-date:20170124T021133Z\n
x-yop-request-id:01e447af-9749-4075-8e6c-17df519f2720\n
```

#### b、计算签名

计算签名的具体步骤如下，以 ``YOP-RSA-SHA256``为例：

1. 将规范请求``canonicalRequest``转换为字节数组byte[]；
2. 使用 java.security 包下的 Signature 类构造签名工具，签名方法使用“SHA256withRSA”；
3. 使用initSign方法导入商户私钥``isvPrivateKey``和字节数组byte[]；
4. 使用sign方法生成签名；
5. 使用 Base64.encodeBase64URLSafeString 对签名进行编码；
6. 在后面拼接“$SHA256”字符串。

#### c、计算签名示例

规范请求``canonicalRequest``：

```text
yop-auth-v3/app_100123456789/2021-12-08T11:59:16Z/1800
POST
/rest/v1.0/trade/order

content-type:application%2Fx-www-form-urlencoded
x-yop-appkey:app_100123456789
x-yop-content-sha256:d9c89c72b774c89e2d15c19fc3326e7c9508d605a7974ab0a636d9121c97e7ff
x-yop-request-id:d48782ac-93c1-466e-b417-f7a71e4965f0
```

商户私钥``isvPrivateKey``：

```text
RSA算法的商户私钥isvPrivateKey：
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC+YgO139eaN/Cjd3mTE4ePwqSI1F8ubXojffiwXy+mEiYGR4YscIcPQiYUGb2YpZQHa/Zoz+OyuloBCQBS1C8cva91KJojzUA4ll88vj8JF64G3P6WZh8acoUdNo8WRWfj9TVMMPBtzVcLK2bujrfx/t5Sggi66IK1FthcEtrkN8atA3rLj4OhNbZOzQRadecZDkeVelXU5LvNvBhBwO1cJ2Agr7ezkUaQENau/TSIAKdGJt607daB/MDgQdNrCNc/lUnp9+a8BUNYNCyJQZJKeAyVqFO73c/v3dlRaAUUfoH+hIbmS0g3aSpmxexvka6BFEld16wRG41VSGFhXbkRAgMBAAECggEASC9/uqkp5ZaKTmDRnvuLre2eVyc3A7KM2gI8lhsxROWit0TNUfJEs3tgVsS/x64YZ4v+/RS+ABl6YOQZ1E4RovMlIOYJM8PyMsKJT83OttLcsEuA2GPWLT/4yu/R5x7f2mYyFDaGIwv1kg2d1JwWkNITV/Nn/f6E+Ma1uIuJpXf9CVxIokfWFMstGNAGw/871V1qKAIDRsWTN4gTT4aRK/FPvQNzHv4nSEtlYdAYE8r53MaAZfigfFSOGowPFegyktQJXfmAUOhZbRhRZGQqcwU/1M5/TKu1cJECM/N/1ttjMlPNamQmONawq8dqfpK7a45YyWgyaadN2flA4/nWdQKBgQDWwrQsxnoVcoL88fFZYwol/5RYG+eA9zMffCi39KsKBU6ePbLlORYd2D/f2nDno6Uz2tFnUoRLvKy3ZINuIdN/jgD4ob69tk7XIKQSzh9Tv2485P8PasublywgdG9LnYk8qbF1VDsOkgecSSh7xG8Rz/U9p9kI5/wt3OOc0brjKwKBgQDi8PDtFziZNVSC58BcaWpAfZyDwB8X56BtNz1890zVOvF8ali6GUwgZkcH8KsQXhu+1YkmnC/YS6H0s+ZE4CIP6FGw5Z8988UB2i+oB0BMK8l8WDFOgPyW2n9l6502Qx1tqD3alekcksFsIlUgP9sVc5vtAKUPtNgguhRcP6mmswKBgQDCkkSLDIcvR0BFyy3OvlxDcPsFmMJ1pYE71VFO2Ozdd1FzLJMX+lB/WZ0FQvNn6muSP33ZDnmt5JLW1Mn+zcbAmfdnS6N0XeewIHKGVxkq1xUZNp+faDJwFNZ10QfEikX8IAIXOukGmmcqwV1cROwcRzz5T0jjOMrRAn91ZM7dYQKBgC91JVzfU0WuwlqRrkdlAAQ2gGmI3re4B3NvbttYN+gLaH6VGrLoIWRRHx+I86z7kR/KNeEuHk9EGb07dbcHi/f5pEOy8ScaeCNYBklEIu0K5xqqsrzw+mFtleCxcfHr/RZ2bWDtoo8IHYzIbTbOQ7lrsLrSPLJZJi1J3IIiCg9DAoGAOxT0qqTUADmSvwnzyQAYJ5sFI36eMcKqwkBuqb7ZQiLFNv1WZROrkeGin2ishntFKsIUtrpeikPjNP2AX6X0UuSQsUNNWx1zYpSlNUyGtGueYhmmP+7plPN5BhuJ3Ba6IYC/uI/l1tJP3S4e/xa/rCcNrf36RzK+PLLPq/uPAaY=
```

签名``signature``：

```text
RSA算法生成的签名signature：
pOVoj1mI5bqYQQKTlE8iIYm0DKHpL5Q2vscY03lwP3KXpHRPJlKQfEOgpW-jfsyWf46c-uPehOZfOke7vla3rY6FtAVeoX0g8319WEdvQVgXwzW7xPtp5er4No8gpCrizsbmp2Fw7NSjASGsCaLEEri8iHsvN_TgFsGEIUf9JtQYWkoqdOh6vK1-xZvisp2ePAg2GKHy1Y0tbkXbzO9Bp_dBkgEHI7B2N80mzn-tEZ0xi6uMKSSvI8VPK14Rys8pJ4c4I4RZjoDEnxxsG2Z977RGtCuf_3RvrwohxECO5iF8BMjJF89nqi50QaZtS2mx32649_cORFLbD8VFpQhyxA$SHA256
```

附本示例的请求报文：

```json
POST /yop-center/rest/v1.0/trade/order HTTP/1.1
Host: openapi.yeepay.com
Authorization: YOP-RSA2048-SHA256 yop-auth-v3/app_100123456789/2021-12-08T11:59:16Z/1800/content-type;x-yop-appkey;x-yop-content-sha256;x-yop-request-id/pOVoj1mI5bqYQQKTlE8iIYm0DKHpL5Q2vscY03lwP3KXpHRPJlKQfEOgpW-jfsyWf46c-uPehOZfOke7vla3rY6FtAVeoX0g8319WEdvQVgXwzW7xPtp5er4No8gpCrizsbmp2Fw7NSjASGsCaLEEri8iHsvN_TgFsGEIUf9JtQYWkoqdOh6vK1-xZvisp2ePAg2GKHy1Y0tbkXbzO9Bp_dBkgEHI7B2N80mzn-tEZ0xi6uMKSSvI8VPK14Rys8pJ4c4I4RZjoDEnxxsG2Z977RGtCuf_3RvrwohxECO5iF8BMjJF89nqi50QaZtS2mx32649_cORFLbD8VFpQhyxA$SHA256
x-yop-request-id: d48782ac-93c1-466e-b417-f7a71e4965f0
User-Agent: java/4.1.8/Mac_OS_X/10.16/Java_HotSpot(TM)_64-Bit_Server_VM/25.291-b10/1.8.0_291/zh/
x-yop-appkey: app_100123456789
x-yop-content-sha256: d9c89c72b774c89e2d15c19fc3326e7c9508d605a7974ab0a636d9121c97e7ff
Content-Type: application/x-www-form-urlencoded
Content-Length: 108
Connection: Keep-Alive
Accept-Encoding: gzip,deflate

orderId=1234321&orderAmount=100.05&notifyUrl=https%253A%252F%252Fxxx.com%252Fnotify&parentMerchantNo=1234321
```
## 二、包含中文字符的签名与验签示例 (RSA)

本示例演示当请求参数包含中文字符时，如何使用 RSA 算法进行签名和验签。我们将以一个包含中文字符的 JSON 请求体为例。

**场景假设:**

*   **请求方法:** `POST`
*   **请求 URI:** `/rest/v1.0/test/chinese-params`
*   **请求头:**
    *   `Content-Type`: `application/json; charset=utf-8`
    *   `x-yop-appkey`: `app_100888888888` (示例 AppKey)
    *   `x-yop-request-id`: `uuid-chinese-test-12345` (示例请求 ID)
    *   `x-yop-date`: `2025-04-20T12:30:00Z` (示例时间戳，与 authString 中的 timestamp 一致)
*   **请求体 (JSON):** `{"name": "张三", "city": "上海"}`
*   **商户私钥 (isvPrivateKey):** (使用文档中已有的 RSA 私钥示例)
    ```text
    MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC+YgO139eaN/Cjd3mTE4ePwqSI1F8ubXojffiwXy+mEiYGR4YscIcPQiYUGb2YpZQHa/Zoz+OyuloBCQBS1C8cva91KJojzUA4ll88vj8JF64G3P6WZh8acoUdNo8WRWfj9TVMMPBtzVcLK2bujrfx/t5Sggi66IK1FthcEtrkN8atA3rLj4OhNbZOzQRadecZDkeVelXU5LvNvBhBwO1cJ2Agr7ezkUaQENau/TSIAKdGJt607daB/MDgQdNrCNc/lUnp9+a8BUNYNCyJQZJKeAyVqFO73c/v3dlRaAUUfoH+hIbmS0g3aSpmxexvka6BFEld16wRG41VSGFhXbkRAgMBAAECggEASC9/uqkp5ZaKTmDRnvuLre2eVyc3A7KM2gI8lhsxROWit0TNUfJEs3tgVsS/x64YZ4v+/RS+ABl6YOQZ1E4RovMlIOYJM8PyMsKJT83OttLcsEuA2GPWLT/4yu/R5x7f2mYyFDaGIwv1kg2d1JwWkNITV/Nn/f6E+Ma1uIuJpXf9CVxIokfWFMstGNAGw/871V1qKAIDRsWTN4gTT4aRK/FPvQNzHv4nSEtlYdAYE8r53MaAZfigfFSOGowPFegyktQJXfmAUOhZbRhRZGQqcwU/1M5/TKu1cJECM/N/1ttjMlPNamQmONawq8dqfpK7a45YyWgyaadN2flA4/nWdQKBgQDWwrQsxnoVcoL88fFZYwol/5RYG+eA9zMffCi39KsKBU6ePbLlORYd2D/f2nDno6Uz2tFnUoRLvKy3ZINuIdN/jgD4ob69tk7XIKQSzh9Tv2485P8PasublywgdG9LnYk8qbF1VDsOkgecSSh7xG8Rz/U9p9kI5/wt3OOc0brjKwKBgQDi8PDtFziZNVSC58BcaWpAfZyDwB8X56BtNz1890zVOvF8ali6GUwgZkcH8KsQXhu+1YkmnC/YS6H0s+ZE4CIP6FGw5Z8988UB2i+oB0BMK8l8WDFOgPyW2n9l6502Qx1tqD3alekcksFsIlUgP9sVc5vtAKUPtNgguhRcP6mmswKBgQDCkkSLDIcvR0BFyy3OvlxDcPsFmMJ1pYE71VFO2Ozdd1FzLJMX+lB/WZ0FQvNn6muSP33ZDnmt5JLW1Mn+zcbAmfdnS6N0XeewIHKGVxkq1xUZNp+faDJwFNZ10QfEikX8IAIXOukGmmcqwV1cROwcRzz5T0jjOMrRAn91ZM7dYQKBgC91JVzfU0WuwlqRrkdlAAQ2gGmI3re4B3NvbttYN+gLaH6VGrLoIWRRHx+I86z7kR/KNeEuHk9EGb07dbcHi/f5pEOy8ScaeCNYBklEIu0K5xqqsrzw+mFtleCxcfHr/RZ2bWDtoo8IHYzIbTbOQ7lrsLrSPLJZJi1J3IIiCg9DAoGAOxT0qqTUADmSvwnzyQAYJ5sFI36eMcKqwkBuqb7ZQiLFNv1WZROrkeGin2ishntFKsIUtrpeikPjNP2AX6X0UuSQsUNNWx1zYpSlNUyGtGueYhmmP+7plPN5BhuJ3Ba6IYC/uI/l1tJP3S4e/xa/rCcNrf36RzK+PLLPq/uPAaY=
    ```
*   **YOP 公钥 (yopPublicKey):** (需要与上述私钥对应的公钥，这里用一个示意性的)
    ```text
    MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAvmIDtd/Xmjfwo3d5kxOHj8KkiNRfLm16I334sF8vphImBkeGLHCHD0ImFBm9mKWUB2v2aM/jsrpqAQkAUrQvHL2vdSiaI81AOJJfPL4/CReuBtz+lmYfGnKFH voyageursNo8WRWfj9TVMMPBtzVcLK2bujrfx/t5Sggi66IK1FthcEtrkN8atA3rLj4OhNbZOzQRadecZDkeVelXU5LvNvBhBwO1cJ2Agr7ezkUaQENau/TSIAKdGJt607daB/MDgQdNrCNc/lUnp9+a8BUNYNCyJQZJKeAyVqFO73c/v3dlRaAUUfoH+hIbmS0g3aSpmxexvka6BFEld16wRG41VSGFhXbkRAgMBAAE=
    ```

### 1. 构造待签名字符串 (CanonicalRequest)

**输入:**

*   `authString`: `yop-auth-v3/app_100888888888/2025-04-20T12:30:00Z/1800`
*   `httpRequestMethod`: `POST`
*   `canonicalURI`: `/rest/v1.0/test/chinese-params`
*   `canonicalQueryString`: "" (因为是 POST JSON 请求，查询字符串为空)
*   `canonicalHeaders`: (根据请求头构造，注意排序和编码)
    *   原始请求体 (JSON): `{"name": "张三", "city": "上海"}`
    *   **关键:** 使用 UTF-8 编码计算请求体的 SHA256 哈希值。
        ```java
        // 假设 requestBodyJson 是包含中文字符的 JSON 字符串
        String requestBodyJson = "{\"name\": \"张三\", \"city\": \"上海\"}";
        // 必须指定 UTF-8 编码获取字节
        byte[] jsonBytes = requestBodyJson.getBytes(StandardCharsets.UTF_8);
        String contentHash = DigestUtil.digestHex(jsonBytes, DigestAlgEnum.SHA256);
        // contentHash 的结果 (示例值，实际计算为准): e.g., "a1b2c3d4..."
        ```
        假设计算得到的 `x-yop-content-sha256` 为: `7d8a3f5b...` (这是一个示例哈希值，实际运行时需要根据真实请求体计算)
    *   构造规范头 (Canonical Headers):
        ```text
        content-type:application%2Fjson%3B%20charset%3Dutf-8\n
        x-yop-appkey:app_100888888888\n
        x-yop-content-sha256:7d8a3f5b...\n
        x-yop-date:2025-04-20T12%3A30%3A00Z\n
        x-yop-request-id:uuid-chinese-test-12345
        ```
        *注意:* Header Name 需转小写并按 ASCII 排序。Header Value 需要进行 URL 编码 (Trim 处理后)。

**输出 (CanonicalRequest):**

```text
yop-auth-v3/app_100888888888/2025-04-20T12:30:00Z/1800
POST
/rest/v1.0/test/chinese-params

content-type:application%2Fjson%3B%20charset%3Dutf-8
x-yop-appkey:app_100888888888
x-yop-content-sha256:7d8a3f5b...
x-yop-date:2025-04-20T12%3A30%3A00Z
x-yop-request-id:uuid-chinese-test-12345
```
*(请注意上面 `x-yop-content-sha256` 的值是示意性的，实际值需要根据 JSON 字符串 `{"name": "张三", "city": "上海"}` 使用 UTF-8 编码计算 SHA256 得到)*

### 2. 生成签名 (Signature)

**输入:**

*   `canonicalRequest`: 上一步构造的规范请求字符串。
*   `isvPrivateKey`: 商户 RSA 私钥。
*   `signAlgorithm`: `SHA256withRSA`

**关键 Java 代码片段 (使用 YOP SDK):**

```java
import com.yeepay.yop.sdk.security.Signer;
import com.yeepay.yop.sdk.security.SignerFactory;
import com.yeepay.yop.sdk.security.SignOptions;
import com.yeepay.yop.sdk.security.DigestAlgEnum;
import com.yeepay.yop.sdk.base.security.digest.YopDigester;
import com.yeepay.yop.sdk.base.security.digest.YopDigesterFactory;
import com.yeepay.yop.sdk.security.CertTypeEnum;
import com.yeepay.yop.sdk.security.rsa.RSAKeyUtils; // 用于加载密钥
import java.security.PrivateKey;
import java.nio.charset.StandardCharsets;
import org.apache.commons.codec.binary.Base64; // 用于 Base64 URL Safe 编码

// ...

// 1. 获取规范请求字符串
String canonicalRequest = "yop-auth-v3/app_100888888888/2025-04-20T12:30:00Z/1800\n" +
                        "POST\n" +
                        "/rest/v1.0/test/chinese-params\n" +
                        "\n" + // canonicalQueryString 为空
                        "content-type:application%2Fjson%3B%20charset%3Dutf-8\n" +
                        "x-yop-appkey:app_100888888888\n" +
                        "x-yop-content-sha256:7d8a3f5b...\n" + // 使用实际计算的哈希值
                        "x-yop-date:2025-04-20T12%3A30%3A00Z\n" +
                        "x-yop-request-id:uuid-chinese-test-12345";

// 2. 加载商户私钥 (假设私钥存储在字符串变量 isvPrivateKeyPem 中)
String isvPrivateKeyPem = "MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSj..."; // 完整的 PEM 格式私钥
PrivateKey privateKey = RSAKeyUtils.string2PrivateKey(isvPrivateKeyPem);

// 3. 获取签名器实例
// 注意: YOP SDK 可能有更封装的方式获取 Signer，这里演示核心逻辑
java.security.Signature signatureProvider = java.security.Signature.getInstance("SHA256withRSA");
signatureProvider.initSign(privateKey);

// 4. 更新待签名数据 (必须使用 UTF-8 编码获取字节)
signatureProvider.update(canonicalRequest.getBytes(StandardCharsets.UTF_8));

// 5. 执行签名
byte[] signatureBytes = signatureProvider.sign();

// 6. 对签名结果进行 Base64 URL Safe 编码
String base64UrlSafeSignature = Base64.encodeBase64URLSafeString(signatureBytes);

// 7. 拼接签名算法标识
String finalSignature = base64UrlSafeSignature + "$SHA256";

System.out.println("Final Signature: " + finalSignature);

```

**输出 (最终签名 Signature):**

```text
(一个 Base64 URL Safe 编码的长字符串，由上述代码生成，例如: abcdef123...xyz)$SHA256
```
*(最终签名值依赖于 `canonicalRequest` (包含实际计算的 `x-yop-content-sha256`) 和私钥，每次运行会不同)*

### 3. 验签流程 (Verification)

接收方 (如 YOP 平台) 收到请求后，执行以下步骤进行验签：

**步骤 1: 解析 Authorization 头**

*   **输入:** `Authorization: YOP-RSA2048-SHA256 yop-auth-v3/app_100888888888/2025-04-20T12:30:00Z/1800/content-type;x-yop-appkey;x-yop-content-sha256;x-yop-date;x-yop-request-id/(签名值)$SHA256`
*   **输出:**
    *   `securityReq`: `YOP-RSA2048-SHA256`
    *   `authString`: `yop-auth-v3/app_100888888888/2025-04-20T12:30:00Z/1800`
    *   `signedHeaders`: `content-type;x-yop-appkey;x-yop-content-sha256;x-yop-date;x-yop-request-id`
    *   `signature`: `(签名值)$SHA256`

**步骤 2: 提取请求要素**

*   **输入:** 完整的 HTTP 请求 (方法, URI, Headers, Body)
*   **输出:**
    *   `httpRequestMethod`: `POST`
    *   `canonicalURI`: `/rest/v1.0/test/chinese-params`
    *   `canonicalQueryString`: ""
    *   `Headers`: 从请求中提取 `signedHeaders` 列表中的所有头信息。
    *   `RequestBody`: `{"name": "张三", "city": "上海"}`

**步骤 3: 重构 CanonicalRequest**

*   **输入:** `authString`, `httpRequestMethod`, `canonicalURI`, `canonicalQueryString`, `Headers`, `RequestBody`
*   **过程:**
    1.  计算 `x-yop-content-sha256`:
        *   **关键:** 读取请求体 `RequestBody`。**必须使用请求头 `Content-Type` 中指定的 `charset` (若有，通常是 utf-8) 或默认 UTF-8 将请求体字符串转换为字节数组**。
        *   使用 SHA256 计算哈希值。
        ```java
        // 假设 receivedRequestBody 是从请求中读取的原始 JSON 字符串
        String receivedRequestBody = "{\"name\": \"张三\", \"city\": \"上海\"}";
        // 必须指定 UTF-8 编码获取字节
        byte[] receivedJsonBytes = receivedRequestBody.getBytes(StandardCharsets.UTF_8);
        String recalculatedContentHash = DigestUtil.digestHex(receivedJsonBytes, DigestAlgEnum.SHA256);
        // 重新计算得到的哈希值，应与请求头中的 x-yop-content-sha256 一致
        ```
    2.  构造 `canonicalHeaders`:
        *   将从请求中提取的、且在 `signedHeaders` 列表中的 Header，进行小写转换、Trim、URL 编码、排序，并用 `\n` 连接。确保使用重新计算出的 `x-yop-content-sha256`。
    3.  拼接 `canonicalRequest`: 按照 `authString + "\n" + httpRequestMethod + "\n" + canonicalURI + "\n" + canonicalQueryString + "\n" + canonicalHeaders` 的格式拼接。
*   **输出:** `reconstructedCanonicalRequest` (理论上应与发送方构造的 `canonicalRequest` 完全一致)

**步骤 4: 使用公钥验证签名**

*   **输入:**
    *   `reconstructedCanonicalRequest`: 上一步重构的规范请求。
    *   `signature`: 从 Authorization 头解析出的原始签名值 (例如 `abcdef123...xyz$SHA256`)。
    *   `yopPublicKey`: 用于验签的 YOP 平台公钥或对应的商户公钥。
    *   `signAlgorithm`: `SHA256withRSA`
*   **关键 Java 代码片段 (使用 YOP SDK):**
    ```java
    import com.yeepay.yop.sdk.security.rsa.RSAKeyUtils; // 用于加载密钥
    import java.security.PublicKey;
    import java.nio.charset.StandardCharsets;
    import org.apache.commons.codec.binary.Base64; // 用于 Base64 URL Safe 解码

    // ...

    // 1. 获取重构的规范请求
    String reconstructedCanonicalRequest = "..."; // 上一步的结果

    // 2. 获取原始签名值并解码
    String originalSignatureWithAlg = "abcdef123...xyz$SHA256"; // 从 Authorization 头获取
    String base64UrlSafeSignature = originalSignatureWithAlg.substring(0, originalSignatureWithAlg.lastIndexOf('$'));
    byte[] signatureBytes = Base64.decodeBase64(base64UrlSafeSignature); // Base64 URL Safe 解码

    // 3. 加载 YOP 公钥 (假设公钥存储在字符串变量 yopPublicKeyPem 中)
    String yopPublicKeyPem = "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA..."; // 完整的 PEM 格式公钥
    PublicKey publicKey = RSAKeyUtils.string2PublicKey(yopPublicKeyPem);

    // 4. 获取验签器实例
    java.security.Signature verifier = java.security.Signature.getInstance("SHA256withRSA");
    verifier.initVerify(publicKey);

    // 5. 更新待验签数据 (必须使用 UTF-8 编码获取字节)
    verifier.update(reconstructedCanonicalRequest.getBytes(StandardCharsets.UTF_8));

    // 6. 执行验签
    boolean isValid = verifier.verify(signatureBytes);

    System.out.println("Signature verification result: " + isValid);
    ```
*   **输出:** `boolean` 值，`true` 表示验签成功，`false` 表示失败。

**步骤 5: 检查时间戳**

*   **输入:** `authString` (包含 `timestamp` 和 `expiredSeconds`)
*   **过程:** 解析 `timestamp` 和 `expiredSeconds`，与当前服务器时间比较，判断请求是否在有效期内。
*   **输出:** `boolean` 值，`true` 表示有效，`false` 表示过期。

**结论:**

只有当步骤 4 (验签) 和步骤 5 (时间戳检查) 均成功时，请求才被认为是合法有效的。处理包含中文字符的关键在于，在计算 `x-yop-content-sha256` 和构造/验签 `canonicalRequest` 时，**始终确保使用正确的字符编码 (通常是 UTF-8)** 将字符串转换为字节数组。
## 附录：含中文字符的RSA签名与验签示例 (UTF-8编码)

本示例演示了当请求参数（特别是 JSON 请求体）包含中文字符时，如何正确进行签名和验签。

**1. 原始请求参数 (POST JSON)**

假设请求体为一个 JSON 对象，包含中文字符：

```json
{"city":"上海","name":"张三"}
```

**注意:** 对于 JSON 请求体，计算签名和摘要时，应使用 **序列化后且排序后的 JSON 字符串**。为确保一致性，建议在序列化时启用按 Key 字母序排序的功能。以上示例已按字母排序 (`city` 在 `name` 之前)。

**2. 构造待签名字符串 (CanonicalRequest)**

根据 YOP 签名规范，需要构建 CanonicalRequest 字符串。关键步骤如下：

*   **HTTP方法:** POST
*   **CanonicalURI:** `/rest/v1.0/test/chinese-params` (示例 API 地址)
*   **CanonicalQueryString:** 对于 POST JSON 请求，此项为空字符串。
*   **CanonicalHeaders:**
    *   计算请求体的 SHA256 哈希值 (`x-yop-content-sha256`)。**必须确保使用 UTF-8 编码读取 JSON 字符串的字节流进行哈希计算。**
        *   输入 (JSON 字符串, UTF-8): `{"city":"上海","name":"张三"}`
        *   输出 (SHA256 Hex): `03357a578289a6aab9b27ce7d53dbf5aedf8f1121d60dd0b455eaa83db8a424e` (此值为示例，实际值取决于 JSON 字符串)
    *   包含必要的 YOP 头信息（如 `x-yop-appkey`, `x-yop-request-id`, `x-yop-content-sha256`），将 Header 名称转为小写，并按名称排序。
        *   示例 Headers (排序后):
            ```
            x-yop-appkey:sandbox_rsa_10080041523
            x-yop-content-sha256:03357a578289a6aab9b27ce7d53dbf5aedf8f1121d60dd0b455eaa83db8a424e
            x-yop-request-id:test-chinese-uuid-placeholder 
            ```
            *(注意: `x-yop-request-id` 应为实际请求的唯一 ID)*
*   **认证串 (Authorization String Prefix):** `yop-auth-v3/{appKey}/{timestamp}/{expirationPeriodInSeconds}`
    *   示例: `yop-auth-v3/sandbox_rsa_10080041523/2025-04-20T07:08:43Z/1800` *(时间戳和 AppKey 应替换为实际值)*

*   **组合 CanonicalRequest:**
    ```
    yop-auth-v3/sandbox_rsa_10080041523/2025-04-20T07:08:43Z/1800
    POST
    /rest/v1.0/test/chinese-params

    x-yop-appkey:sandbox_rsa_10080041523
    x-yop-content-sha256:03357a578289a6aab9b27ce7d53dbf5aedf8f1121d60dd0b455eaa83db8a424e
    x-yop-request-id:test-chinese-uuid-placeholder
    ```

**3. 生成签名 (Java 示例)**

使用商户私钥和 `SHA256withRSA` 算法对 CanonicalRequest 字符串 (同样确保使用 **UTF-8 编码**获取字节流) 进行签名。

```java
import java.security.PrivateKey;
import java.security.Signature;
import java.security.KeyFactory;
import java.security.spec.PKCS8EncodedKeySpec;
import java.util.Base64; // 使用 java.util.Base64

// ... (省略加载 ISV_PRIVATE_KEY 的代码)

String canonicalRequest = "..."; // 上一步构造的 CanonicalRequest 字符串
byte[] dataToSign = canonicalRequest.getBytes("UTF-8"); // 确保 UTF-8

// 加载私钥 (示例)
PKCS8EncodedKeySpec keySpec = new PKCS8EncodedKeySpec(java.util.Base64.getDecoder().decode(ISV_PRIVATE_KEY));
KeyFactory keyFactory = KeyFactory.getInstance("RSA");
PrivateKey privateKey = keyFactory.generatePrivate(keySpec);

// 签名
Signature signer = Signature.getInstance("SHA256withRSA");
signer.initSign(privateKey);
signer.update(dataToSign);
byte[] signatureBytes = signer.sign();

// Base64 URL Safe 编码
String signatureBase64UrlSafe = java.util.Base64.getUrlEncoder().encodeToString(signatureBytes);

// 最终签名头 Authorization
String authorizationHeader = "YOP-RSA2048-SHA256 " + authString + "/x-yop-appkey;x-yop-content-sha256;x-yop-request-id/" + signatureBase64UrlSafe + "$SHA256";

```

**4. 最终签名值 (示例)**

基于上述示例参数和假设的私钥，生成的签名值 (URL Safe Base64 编码) 可能如下所示 (实际值会因时间戳、RequestID 和私钥而异)：

```
efNod6fBEVbaeDpfe5u8LRs3wjW4YRY1Nks12GQ7Ok0n13j2AGSOKBNbYR6G4IgYBP0tcaggaSCRp3g8gB2sQw-qqyebZsj56b0edXCC9o8RiI1z1jLIABqZd7CVKY6T6DAmBTNKufpf5ia9nOvWan3C3eeIDzsjcwqYbq7j3LDzq-ASliTKx-RvKYyrcgQqHDWTdhmfny8JbaAfFqv8V0BPrUyhBwdzpxiLog_mrVqXPsGA1bO8AzS978RN2sZ3MeDL09E_k5Lr9nlPx4uvuPIRAU7I3ApqoN82mni9byK6xmYFNeB9J5jz38qvtEivDRMR3X9wI_fhJ3QRkZ059g==
```

最终放入 HTTP Header 的 `Authorization` 值为：

```
YOP-RSA2048-SHA256 yop-auth-v3/sandbox_rsa_10080041523/2025-04-20T07:08:43Z/1800/x-yop-appkey;x-yop-content-sha256;x-yop-request-id/efNod6fBEVbaeDpfe5u8LRs3wjW4YRY1Nks12GQ7Ok0n13j2AGSOKBNbYR6G4IgYBP0tcaggaSCRp3g8gB2sQw-qqyebZsj56b0edXCC9o8RiI1z1jLIABqZd7CVKY6T6DAmBTNKufpf5ia9nOvWan3C3eeIDzsjcwqYbq7j3LDzq-ASliTKx-RvKYyrcgQqHDWTdhmfny8JbaAfFqv8V0BPrUyhBwdzpxiLog_mrVqXPsGA1bO8AzS978RN2sZ3MeDL09E_k5Lr9nlPx4uvuPIRAU7I3ApqoN82mni9byK6xmYFNeB9J5jz38qvtEivDRMR3X9wI_fhJ3QRkZ059g==$SHA256
```

**5. 接收方验签步骤**

接收方（如 YOP 平台或回调接收服务）收到请求后，需要使用 **对应的公钥** 来验证签名。对于请求签名（如本例），通常使用 **ISV 公钥**（与签名所用的 ISV 私钥对应）；对于 YOP 平台的回调通知，则使用 **YOP 平台公钥**。本示例模拟的是验证请求签名，因此使用 **ISV 公钥**。

*   **输入1 (Authorization Header):** 从 HTTP 请求头中获取 `Authorization` 字段的值。
    *   示例: `YOP-RSA2048-SHA256 yop-auth-v3/sandbox_rsa_10080041523/2025-04-20T07:08:43Z/1800/x-yop-appkey;x-yop-content-sha256;x-yop-request-id/efNod6fBEVbaeDpfe5u8LRs3wjW4YRY1Nks12GQ7Ok0n13j2AGSOKBNbYR6G4IgYBP0tcaggaSCRp3g8gB2sQw-qqyebZsj56b0edXCC9o8RiI1z1jLIABqZd7CVKY6T6DAmBTNKufpf5ia9nOvWan3C3eeIDzsjcwqYbq7j3LDzq-ASliTKx-RvKYyrcgQqHDWTdhmfny8JbaAfFqv8V0BPrUyhBwdzpxiLog_mrVqXPsGA1bO8AzS978RN2sZ3MeDL09E_k5Lr9nlPx4uvuPIRAU7I3ApqoN82mni9byK6xmYFNeB9J5jz38qvtEivDRMR3X9wI_fhJ3QRkZ059g==$SHA256`
*   **输入2 (请求体):** 获取原始的 HTTP 请求体。
    *   示例: `{"city":"上海","name":"张三"}`
*   **输入3 (ISV 公钥):** 使用与签名私钥对应的 ISV 公钥。可以通过 ISV 私钥推导得出，或者使用商户在 YOP 平台配置的公钥。
    *   示例 (由 ISV 私钥推导): `MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAvmIDtd/Xmjfwo3d5kxOHj8KkiNRfLm16I334sF8vphImBkeGLHCHD0ImFBm9mKWUB2v2aM/jsrpqAQkAUrQvHL2vdSiaI81AOJJfPL4/CReuBtz+lmYfGnKFH voyageursNo8WRWfj9TVMMPBtzVcLK2bujrfx/t5Sggi66IK1FthcEtrkN8atA3rLj4OhNbZOzQRadecZDkeVelXU5LvNvBhBwO1cJ2Agr7ezkUaQENau/TSIAKdGJt607daB/MDgQdNrCNc/lUnp9+a8BUNYNCyJQZJKeAyVqFO73c/v3dlRaAUUfoH+hIbmS0g3aSpmxexvka6BFEld16wRG41VSGFhXbkRAgMBAAE=`

*   **步骤1: 解析 Authorization Header**
    *   提取认证串前缀 (`yop-auth-v3/.../1800`)。
    *   提取签名 (`efNod6fB...==`)。
    *   提取签名算法 (`SHA256`)。
*   **步骤2: 重构 CanonicalRequest**
    *   使用接收到的请求信息（方法、URI、Query 参数、Headers - **特别是重新计算请求体的 x-yop-content-sha256**）和认证串前缀，按照与签名方 **完全相同** 的规则构造 CanonicalRequest 字符串。**确保所有字符串操作和字节转换使用 UTF-8 编码。**
    *   预期输出 (与签名方构造的应一致):
        ```
        yop-auth-v3/sandbox_rsa_10080041523/2025-04-20T07:08:43Z/1800
        POST
        /rest/v1.0/test/chinese-params

        x-yop-appkey:sandbox_rsa_10080041523
        x-yop-content-sha256:03357a578289a6aab9b27ce7d53dbf5aedf8f1121d60dd0b455eaa83db8a424e
        x-yop-request-id:test-chinese-uuid-placeholder 
        ```
*   **步骤3: 解码签名**
    *   对提取出的签名字符串进行 **Base64 URL Safe 解码**，得到签名的原始字节。
    *   输入 (URL Safe Base64): `efNod6fB...==`
    *   输出 (字节数组): `byte[] signatureBytes = ...`
*   **步骤4: 加载公钥**
    *   将 Base64 编码的 ISV 公钥字符串解码为 `PublicKey` 对象。
*   **步骤5: 执行验签**
    *   使用 `SHA256withRSA` 算法、加载的公钥和重构的 CanonicalRequest 字节流 (UTF-8) 进行验签。
    *   输入 (CanonicalRequest Bytes): `canonicalRequest.getBytes("UTF-8")`
    *   输入 (Signature Bytes): `signatureBytes` (来自步骤 3)
    *   输入 (PublicKey): `publicKey` (来自步骤 4)
    *   预期输出: `true` (表示验签成功)

*   **注意:** 开发者在实现验签逻辑时，应严格遵循 YOP 平台的规范，并仔细检查密钥加载、`Signature` 对象的初始化和更新过程，确保与签名过程完全匹配。
## 附录B：含中文字符的RSA签名与验签示例 (Form URL Encoded, UTF-8编码)

本示例演示了当请求参数以 `application/x-www-form-urlencoded` 形式提交，且包含中文字符时，如何正确进行签名和验签。

**1. 原始请求参数 (POST Form)**

假设请求参数为一个 Map，包含中文字符：

```java
Map<String, Object> params = new HashMap<>();
params.put("name", "李四");
params.put("address", "北京");
params.put("item", "测试商品");
```

**2. 构造待签名字符串 (CanonicalRequest)**

根据 YOP 签名规范，需要构建 CanonicalRequest 字符串。关键步骤如下：

*   **HTTP方法:** POST
*   **CanonicalURI:** `/rest/v1.0/test/chinese-params-form` (示例 API 地址)
*   **CanonicalQueryString:** 对于 `POST` 且 `Content-Type` 为 `application/x-www-form-urlencoded` 的请求，此项 **必须为空字符串**。
*   **CanonicalHeaders:**
    *   计算请求参数的 SHA256 哈希值 (`x-yop-content-sha256`)。**对于 Form 请求，此计算涉及以下步骤，且必须确保所有字符处理和字节转换使用 UTF-8 编码：**
        1.  **筛选:** 仅包含非文件类型的参数。
        2.  **排序:** 按参数名称 (key) 的 ASCII 字母顺序升序排列。
            *   排序后: `address=北京`, `item=测试商品`, `name=李四`
        3.  **URL编码:** 对排序后的每个参数名称和参数值分别进行 URL 编码 (遵循 RFC 3986，空格编码为 `%20`)。
            *   编码后 (来自测试日志):
                *   `address` -> `address`
                *   `北京` -> `%E5%8C%97%E4%BA%AC`
                *   `item` -> `item`
                *   `测试商品` -> `%E6%B5%8B%E8%AF%95%E5%95%86%E5%93%81`
                *   `name` -> `name`
                *   `李四` -> `%E6%9D%8E%E5%9B%9B`
        4.  **拼接:** 将编码后的参数名和参数值用 `=` 连接，然后将这些键值对用 `&` 连接起来。
            *   拼接后字符串: `address=%E5%8C%97%E4%BA%AC&item=%E6%B5%8B%E8%AF%95%E5%95%86%E5%93%81&name=%E6%9D%8E%E5%9B%9B`
        5.  **计算哈希:** 对最终拼接的字符串计算 SHA256 哈希值，并转换为十六进制表示。
            *   输入 (UTF-8 Bytes of String): `address=%E5%8C%97%E4%BA%AC&item=%E6%B5%8B%E8%AF%95%E5%95%86%E5%93%81&name=%E6%9D%8E%E5%9B%9B`
            *   输出 (SHA256 Hex, 来自测试日志): `701e66577e40ae6c9de2e9360d08ab7d947353eb00c7ff2c9c01133759d58af7`
    *   包含必要的 YOP 头信息（如 `x-yop-appkey`, `x-yop-request-id`, 以及上一步计算出的 `x-yop-content-sha256`），将 Header 名称转为小写，并按名称排序。
        *   示例 Headers (排序后):
            ```
            x-yop-appkey:app_10086032562
            x-yop-content-sha256:701e66577e40ae6c9de2e9360d08ab7d947353eb00c7ff2c9c01133759d58af7
            x-yop-request-id:test-chinese-form-uuid-placeholder
            ```
            *(注意: `x-yop-request-id` 应为实际请求的唯一 ID)*
*   **认证串 (Authorization String Prefix):** `yop-auth-v3/{appKey}/{timestamp}/{expirationPeriodInSeconds}`
    *   示例: `yop-auth-v3/app_10086032562/2025-04-20T08:17:56Z/1800` *(时间戳和 AppKey 应替换为实际值)*

*   **组合 CanonicalRequest:**
    ```
    yop-auth-v3/app_10086032562/2025-04-20T08:17:56Z/1800
    POST
    /rest/v1.0/test/chinese-params-form

    x-yop-appkey:app_10086032562
    x-yop-content-sha256:701e66577e40ae6c9de2e9360d08ab7d947353eb00c7ff2c9c01133759d58af7
    x-yop-request-id:test-chinese-form-uuid-placeholder
    ```
    *(注意: CanonicalQueryString 部分为空行)*

**3. 生成签名 (Java 示例)**

与 JSON 示例类似，使用商户私钥和 `SHA256withRSA` 算法对 **上一步构造的 Form CanonicalRequest** 字符串 (确保使用 **UTF-8 编码**获取字节流) 进行签名。

```java
// ... (代码与 JSON 示例类似，但使用 Form 场景的 canonicalRequest)

String canonicalRequest = "yop-auth-v3/app_10086032562/2025-04-20T08:17:56Z/1800\n" +
                        "POST\n" +
                        "/rest/v1.0/test/chinese-params-form\n" +
                        "\n" + // CanonicalQueryString is empty for POST Form
                        "x-yop-appkey:app_10086032562\n" +
                        "x-yop-content-sha256:701e66577e40ae6c9de2e9360d08ab7d947353eb00c7ff2c9c01133759d58af7\n" + // Use calculated hash
                        "x-yop-request-id:test-chinese-form-uuid-placeholder";

byte[] dataToSign = canonicalRequest.getBytes(StandardCharsets.UTF_8); // Ensure UTF-8

// ... (加载私钥，执行签名，Base64 URL Safe 编码 - 同 JSON 示例)

String finalSignature = base64UrlSafeSignature + "$SHA256";
```

**4. 最终签名值 (示例)**

基于上述示例参数和假设的私钥，生成的签名值 (URL Safe Base64 编码, 来自测试日志) 可能如下所示 (实际值会因时间戳、RequestID 和私钥而异)：

```
VdnmiHu4Fr0UpIp3MPYaf_AQ5GdrOmBov1PN23tq6NLIGVaBLJ90fqoFAMZj8JtbOnX9hfRiHhJ8VzwRVWhbVPhTVaaSOO7EbFQsQm92Jvcrs2l8aZRMRsITZdOREqZmmas56QaqrfG7PtxyQDONzueIRLxQTgQtPYWxB6aSzHRnS8X-j4_TuD-PAbexoTIv-aWsugfc-fisjn2BjHz0dYFw4nFP9xOZgRcFxHDsFZch6JwXjkpRlPTCSO_m4t5DC9o82ibJWQE8OuPL5NLloVpAEvLTLdQ40B-ITUgjqnq64QXk4F3IymgV0E6nyYdPIWuAoNETNfHJ0zO9gkEEfA==
```

最终放入 HTTP Header 的 `Authorization` 值为：

```
YOP-RSA2048-SHA256 yop-auth-v3/app_10086032562/2025-04-20T08:17:56Z/1800/x-yop-appkey;x-yop-content-sha256;x-yop-request-id/VdnmiHu4Fr0UpIp3MPYaf_AQ5GdrOmBov1PN23tq6NLIGVaBLJ90fqoFAMZj8JtbOnX9hfRiHhJ8VzwRVWhbVPhTVaaSOO7EbFQsQm92Jvcrs2l8aZRMRsITZdOREqZmmas56QaqrfG7PtxyQDONzueIRLxQTgQtPYWxB6aSzHRnS8X-j4_TuD-PAbexoTIv-aWsugfc-fisjn2BjHz0dYFw4nFP9xOZgRcFxHDsFZch6JwXjkpRlPTCSO_m4t5DC9o82ibJWQE8OuPL5NLloVpAEvLTLdQ40B-ITUgjqnq64QXk4F3IymgV0E6nyYdPIWuAoNETNfHJ0zO9gkEEfA==$SHA256
```

**5. 接收方验签步骤**

接收方验证签名的步骤与 JSON 示例类似，但有以下关键区别：

*   **输入2 (请求体):** 获取原始的 Form 表单数据 (通常是 `application/x-www-form-urlencoded` 格式的字符串或解析后的 Map)。
*   **步骤2 (重构 CanonicalRequest):**
    *   **计算 `x-yop-content-sha256`:** **必须** 按照签名方的规则（筛选非文件参数 -> 按 key 排序 -> 分别 URL 编码 key 和 value (UTF-8) -> 用 `=` 连接 key 和 value -> 用 `&` 连接所有键值对）来构造用于计算哈希的字符串。
    *   **`canonicalQueryString`:** 必须设置为空字符串。
*   **步骤4 (加载公钥):** 同样使用 **ISV 公钥** 进行验证。

其余步骤（解析 Header、解码签名、执行验签、检查时间戳）与 JSON 场景一致。
## 附录B：含中文字符的RSA签名与验签示例 (Form URL Encoded, UTF-8编码)

本示例演示了当请求参数以 `application/x-www-form-urlencoded` 形式提交，且包含中文字符时，如何正确进行签名和验签。

**1. 原始请求参数 (POST Form)**

假设请求参数为一个 Map，包含中文字符：

```java
Map<String, Object> params = new HashMap<>();
params.put("name", "李四");
params.put("address", "北京");
params.put("item", "测试商品");
```

**2. 构造待签名字符串 (CanonicalRequest)**

根据 YOP 签名规范，需要构建 CanonicalRequest 字符串。关键步骤如下：

*   **HTTP方法:** POST
*   **CanonicalURI:** `/rest/v1.0/test/chinese-params-form` (示例 API 地址)
*   **CanonicalQueryString:** 对于 `POST` 且 `Content-Type` 为 `application/x-www-form-urlencoded` 的请求，此项 **必须为空字符串**。
*   **CanonicalHeaders:**
    *   计算请求参数的 SHA256 哈希值 (`x-yop-content-sha256`)。**对于 Form 请求，此计算涉及以下步骤，且必须确保所有字符处理和字节转换使用 UTF-8 编码：**
        1.  **筛选:** 仅包含非文件类型的参数。
        2.  **排序:** 按参数名称 (key) 的 ASCII 字母顺序升序排列。
            *   排序后: `address=北京`, `item=测试商品`, `name=李四`
        3.  **URL编码:** 对排序后的每个参数名称和参数值分别进行 URL 编码 (遵循 RFC 3986，空格编码为 `%20`)。
            *   编码后 (来自测试日志):
                *   `address` -> `address` (`Original='address'='北京', Encoded='address'='%E5%8C%97%E4%BA%AC'`)
                *   `item` -> `item` (`Original='item'='测试商品', Encoded='item'='%E6%B5%8B%E8%AF%95%E5%95%86%E5%93%81'`)
                *   `name` -> `name` (`Original='name'='李四', Encoded='name'='%E6%9D%8E%E5%9B%9B'`)
        4.  **拼接:** 将编码后的参数名和参数值用 `=` 连接，然后将这些键值对用 `&` 连接起来。
            *   拼接后字符串 (来自测试日志): `address=%E5%8C%97%E4%BA%AC&item=%E6%B5%8B%E8%AF%95%E5%95%86%E5%93%81&name=%E6%9D%8E%E5%9B%9B`
        5.  **计算哈希:** 对最终拼接的字符串计算 SHA256 哈希值，并转换为十六进制表示。
            *   输入 (UTF-8 Bytes of String): `address=%E5%8C%97%E4%BA%AC&item=%E6%B5%8B%E8%AF%95%E5%95%86%E5%93%81&name=%E6%9D%8E%E5%9B%9B`
            *   输出 (SHA256 Hex, 来自测试日志): `701e66577e40ae6c9de2e9360d08ab7d947353eb00c7ff2c9c01133759d58af7`
    *   包含必要的 YOP 头信息（如 `x-yop-appkey`, `x-yop-request-id`, 以及上一步计算出的 `x-yop-content-sha256`），将 Header 名称转为小写，并按名称排序。
        *   示例 Headers (排序后):
            ```
            x-yop-appkey:app_10086032562
            x-yop-content-sha256:701e66577e40ae6c9de2e9360d08ab7d947353eb00c7ff2c9c01133759d58af7
            x-yop-request-id:test-chinese-form-uuid-placeholder
            ```
            *(注意: `x-yop-request-id` 应为实际请求的唯一 ID)*
*   **认证串 (Authorization String Prefix):** `yop-auth-v3/{appKey}/{timestamp}/{expirationPeriodInSeconds}`
    *   示例: `yop-auth-v3/app_10086032562/2025-04-20T08:17:56Z/1800` *(时间戳和 AppKey 应替换为实际值)*

*   **组合 CanonicalRequest:**
    ```
    yop-auth-v3/app_10086032562/2025-04-20T08:17:56Z/1800
    POST
    /rest/v1.0/test/chinese-params-form

    x-yop-appkey:app_10086032562
    x-yop-content-sha256:701e66577e40ae6c9de2e9360d08ab7d947353eb00c7ff2c9c01133759d58af7
    x-yop-request-id:test-chinese-form-uuid-placeholder
    ```
    *(注意: CanonicalQueryString 部分为空行)*

**3. 生成签名 (Java 示例)**

与 JSON 示例类似，使用商户私钥和 `SHA256withRSA` 算法对 **上一步构造的 Form CanonicalRequest** 字符串 (确保使用 **UTF-8 编码**获取字节流) 进行签名。

```java
// ... (代码与 JSON 示例类似，但使用 Form 场景的 canonicalRequest)

String canonicalRequest = "yop-auth-v3/app_10086032562/2025-04-20T08:17:56Z/1800\n" +
                        "POST\n" +
                        "/rest/v1.0/test/chinese-params-form\n" +
                        "\n" + // CanonicalQueryString is empty for POST Form
                        "x-yop-appkey:app_10086032562\n" +
                        "x-yop-content-sha256:701e66577e40ae6c9de2e9360d08ab7d947353eb00c7ff2c9c01133759d58af7\n" + // Use calculated hash
                        "x-yop-request-id:test-chinese-form-uuid-placeholder";

byte[] dataToSign = canonicalRequest.getBytes(StandardCharsets.UTF_8); // Ensure UTF-8

// ... (加载私钥，执行签名，Base64 URL Safe 编码 - 同 JSON 示例)

String finalSignature = base64UrlSafeSignature + "$SHA256";
```

**4. 最终签名值 (示例)**

基于上述示例参数和假设的私钥，生成的签名值 (URL Safe Base64 编码, 来自测试日志) 可能如下所示 (实际值会因时间戳、RequestID 和私钥而异)：

```
VdnmiHu4Fr0UpIp3MPYaf_AQ5GdrOmBov1PN23tq6NLIGVaBLJ90fqoFAMZj8JtbOnX9hfRiHhJ8VzwRVWhbVPhTVaaSOO7EbFQsQm92Jvcrs2l8aZRMRsITZdOREqZmmas56QaqrfG7PtxyQDONzueIRLxQTgQtPYWxB6aSzHRnS8X-j4_TuD-PAbexoTIv-aWsugfc-fisjn2BjHz0dYFw4nFP9xOZgRcFxHDsFZch6JwXjkpRlPTCSO_m4t5DC9o82ibJWQE8OuPL5NLloVpAEvLTLdQ40B-ITUgjqnq64QXk4F3IymgV0E6nyYdPIWuAoNETNfHJ0zO9gkEEfA==
```

最终放入 HTTP Header 的 `Authorization` 值为：

```
YOP-RSA2048-SHA256 yop-auth-v3/app_10086032562/2025-04-20T08:17:56Z/1800/x-yop-appkey;x-yop-content-sha256;x-yop-request-id/VdnmiHu4Fr0UpIp3MPYaf_AQ5GdrOmBov1PN23tq6NLIGVaBLJ90fqoFAMZj8JtbOnX9hfRiHhJ8VzwRVWhbVPhTVaaSOO7EbFQsQm92Jvcrs2l8aZRMRsITZdOREqZmmas56QaqrfG7PtxyQDONzueIRLxQTgQtPYWxB6aSzHRnS8X-j4_TuD-PAbexoTIv-aWsugfc-fisjn2BjHz0dYFw4nFP9xOZgRcFxHDsFZch6JwXjkpRlPTCSO_m4t5DC9o82ibJWQE8OuPL5NLloVpAEvLTLdQ40B-ITUgjqnq64QXk4F3IymgV0E6nyYdPIWuAoNETNfHJ0zO9gkEEfA==$SHA256
```

**5. 接收方验签步骤**

接收方验证签名的步骤与 JSON 示例类似，但有以下关键区别：

*   **输入2 (请求体):** 获取原始的 Form 表单数据 (通常是 `application/x-www-form-urlencoded` 格式的字符串或解析后的 Map)。
*   **步骤2 (重构 CanonicalRequest):**
    *   **计算 `x-yop-content-sha256`:** **必须** 按照签名方的规则（筛选非文件参数 -> 按 key 排序 -> 分别 URL 编码 key 和 value (UTF-8) -> 用 `=` 连接 key 和 value -> 用 `&` 连接所有键值对）来构造用于计算哈希的字符串。
    *   **`canonicalQueryString`:** 必须设置为空字符串。
*   **步骤4 (加载公钥):** 同样使用 **ISV 公钥** 进行验证。

其余步骤（解析 Header、解码签名、执行验签、检查时间戳）与 JSON 场景一致。
