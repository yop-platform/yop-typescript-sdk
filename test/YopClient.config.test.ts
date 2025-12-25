import { describe, beforeEach, afterEach, test, expect } from '@jest/globals';
import { YopClient } from '../src/YopClient';
import { YopConfig } from '../src/types';

/**
 * YopClient 配置加载优先级测试
 *
 * 这个测试套件专注于验证 YopClient 的配置加载逻辑，包括：
 * 1. 配置来源的优先级（显式 config > YOP_PUBLIC_KEY > YOP_PUBLIC_KEY_PATH > 默认文件）
 * 2. 错误处理和回退机制
 * 3. 配置合并逻辑
 *
 * 注意：由于 ESM 模块特性，这些测试使用真实的文件系统操作而不是 mock。
 * 测试主要验证配置加载的优先级顺序和最终结果。
 */
describe('YopClient 配置加载优先级测试', () => {
  let originalEnv: NodeJS.ProcessEnv;

  // 有效的 PEM 格式公钥（用于测试）
  const validPemPublicKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA6p0XWjscY+gsyqKRhw9M
eLsEmhFdBRhT2emOck/F1Omw38ZWhJxh9kDfs5HzFJMrVozgU+SJFDONxs8UB0wM
ILKRmqfLcfClG9MyCNuJkkfm0HFQv1hRGdOvZPXj3Bckuwa7FrEXBRYUhK7vJ40a
fumspthmse6bs6mZxNn/mALZ2X07uznOrrc2rk41Y2HftduxZw6T4EmtWuN2x4CZ
8gwSyPAW5ZzZJLQ6tZDojBK4GZTAGhnn3bg5bBsBlw2+FLkCQBuDsJVsFPiGh/b6
K/+zGTvWyUcu+LUj2MejYQELDO3i2vQXVDk7lVi2/TcUYefvIcssnzsfCfjaorxs
uwIDAQAB
-----END PUBLIC KEY-----`;

  // 用于测试的 mock 私钥
  const mockSecretKey = `-----BEGIN PRIVATE KEY-----
MOCK_SECRET_KEY_CONTENT
-----END PRIVATE KEY-----`;

  beforeEach(() => {
    originalEnv = { ...process.env };
    // 清除所有相关环境变量
    delete process.env.YOP_APP_KEY;
    delete process.env.YOP_SECRET_KEY;
    delete process.env.YOP_PUBLIC_KEY;
    delete process.env.YOP_PUBLIC_KEY_PATH;
    delete process.env.YOP_API_BASE_URL;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('配置来源优先级验证', () => {
    test('[P0] 显式 config.yopPublicKey 应优先于所有环境变量', () => {
      // 设置环境变量（应被忽略）
      process.env.YOP_PUBLIC_KEY = 'env_public_key_should_be_ignored';
      process.env.YOP_PUBLIC_KEY_PATH = '/path/should/be/ignored.cer';

      const config: YopConfig = {
        appKey: 'test_app_key',
        secretKey: mockSecretKey,
        yopPublicKey: validPemPublicKey, // 显式配置
      };

      const client = new YopClient(config);

      // 验证使用的是显式配置的公钥
      expect((client as any).config.yopPublicKey).toBe(validPemPublicKey);
    });

    test('[P0] YOP_PUBLIC_KEY_PATH 应成功加载 .cer 证书文件', () => {
      process.env.YOP_APP_KEY = 'test_app_key';
      process.env.YOP_SECRET_KEY = mockSecretKey;
      // 使用项目中的实际 .cer 文件
      process.env.YOP_PUBLIC_KEY_PATH = './src/assets/yop_platform_rsa_cert_rsa.cer';

      const client = new YopClient();

      // 验证成功从 .cer 文件提取并加载了公钥
      expect((client as any).config.yopPublicKey).toBeDefined();
      expect((client as any).config.yopPublicKey).toContain('BEGIN PUBLIC KEY');
    });

    test('[P0] YOP_PUBLIC_KEY 环境变量应优先于 YOP_PUBLIC_KEY_PATH', () => {
      process.env.YOP_APP_KEY = 'test_app_key';
      process.env.YOP_SECRET_KEY = mockSecretKey;
      process.env.YOP_PUBLIC_KEY = validPemPublicKey;
      process.env.YOP_PUBLIC_KEY_PATH = '/path/should/be/ignored.cer';

      const client = new YopClient();

      // 验证使用的是 YOP_PUBLIC_KEY 环境变量
      expect((client as any).config.yopPublicKey).toBe(validPemPublicKey);
    });

    test('[P0] 应使用默认证书文件当所有环境变量都未设置', () => {
      process.env.YOP_APP_KEY = 'test_app_key';
      process.env.YOP_SECRET_KEY = mockSecretKey;
      // 不设置 YOP_PUBLIC_KEY 和 YOP_PUBLIC_KEY_PATH

      const client = new YopClient();

      // 验证成功加载了公钥（从默认文件）
      expect((client as any).config.yopPublicKey).toBeDefined();
      expect((client as any).config.yopPublicKey).toContain('BEGIN PUBLIC KEY');
    });

    test('[P0] YOP_PUBLIC_KEY_PATH 无效时应回退到默认证书文件', () => {
      process.env.YOP_APP_KEY = 'test_app_key';
      process.env.YOP_SECRET_KEY = mockSecretKey;
      process.env.YOP_PUBLIC_KEY_PATH = '/nonexistent/path/cert.pem';

      // 应该回退到默认证书文件并成功
      const client = new YopClient();

      // 验证成功加载了公钥
      expect((client as any).config.yopPublicKey).toBeDefined();
      expect((client as any).config.yopPublicKey).toContain('BEGIN PUBLIC KEY');
    });
  });

  describe('配置合并逻辑', () => {
    test('[P1] 显式 config 应与环境变量正确合并（config 优先）', () => {
      process.env.YOP_API_BASE_URL = 'https://env-api.yeepay.com';

      const config: YopConfig = {
        appKey: 'config_app_key',
        secretKey: mockSecretKey,
        yopPublicKey: validPemPublicKey,
        // 未设置 yopApiBaseUrl
      };

      const client = new YopClient(config);

      // appKey, secretKey, yopPublicKey 来自 config
      expect((client as any).config.appKey).toBe('config_app_key');
      expect((client as any).config.secretKey).toBe(mockSecretKey);
      expect((client as any).config.yopPublicKey).toBe(validPemPublicKey);
      // yopApiBaseUrl 来自环境变量
      expect((client as any).config.yopApiBaseUrl).toBe('https://env-api.yeepay.com');
    });

    test('[P1] 显式 config 完全覆盖环境变量', () => {
      process.env.YOP_APP_KEY = 'env_app_key';
      process.env.YOP_SECRET_KEY = 'env_secret_key';
      process.env.YOP_PUBLIC_KEY = 'env_public_key';
      process.env.YOP_API_BASE_URL = 'https://env-api.yeepay.com';

      const config: YopConfig = {
        appKey: 'config_app_key',
        secretKey: mockSecretKey,
        yopPublicKey: validPemPublicKey,
        yopApiBaseUrl: 'https://config-api.yeepay.com',
      };

      const client = new YopClient(config);

      // 所有配置应来自 config 对象
      expect((client as any).config.appKey).toBe('config_app_key');
      expect((client as any).config.secretKey).toBe(mockSecretKey);
      expect((client as any).config.yopPublicKey).toBe(validPemPublicKey);
      expect((client as any).config.yopApiBaseUrl).toBe('https://config-api.yeepay.com');
    });

    test('[P2] 未提供 config 时应完全依赖环境变量', () => {
      process.env.YOP_APP_KEY = 'env_app_key';
      process.env.YOP_SECRET_KEY = mockSecretKey;
      process.env.YOP_PUBLIC_KEY = validPemPublicKey;
      process.env.YOP_API_BASE_URL = 'https://env-api.yeepay.com';

      const client = new YopClient();

      expect((client as any).config.appKey).toBe('env_app_key');
      expect((client as any).config.secretKey).toBe(mockSecretKey);
      expect((client as any).config.yopPublicKey).toBe(validPemPublicKey);
      expect((client as any).config.yopApiBaseUrl).toBe('https://env-api.yeepay.com');
    });

    test('[P2] 应使用默认 API Base URL 当未在任何地方设置时', () => {
      process.env.YOP_APP_KEY = 'test_app_key';
      process.env.YOP_SECRET_KEY = mockSecretKey;
      process.env.YOP_PUBLIC_KEY = validPemPublicKey;
      // 不设置 YOP_API_BASE_URL

      const client = new YopClient();

      expect((client as any).config.yopApiBaseUrl).toBe('https://openapi.yeepay.com');
    });
  });

  describe('错误处理', () => {
    test('[P0] 缺少 appKey 应抛出明确错误（使用环境变量）', () => {
      process.env.YOP_SECRET_KEY = mockSecretKey;
      process.env.YOP_PUBLIC_KEY = validPemPublicKey;
      // 不设置 YOP_APP_KEY

      expect(() => new YopClient()).toThrow(/YOP_APP_KEY environment variable is not set/);
    });

    test('[P0] 缺少 secretKey 应抛出明确错误（使用环境变量）', () => {
      process.env.YOP_APP_KEY = 'test_app_key';
      process.env.YOP_PUBLIC_KEY = validPemPublicKey;
      // 不设置 YOP_SECRET_KEY

      expect(() => new YopClient()).toThrow(/YOP_SECRET_KEY environment variable is not set/);
    });

    test('[P0] 缺少 appKey 应抛出明确错误（使用显式 config）', () => {
      const config = {
        secretKey: mockSecretKey,
        yopPublicKey: validPemPublicKey,
      } as YopConfig;

      expect(() => new YopClient(config)).toThrow(
        /appKey is missing in the provided config object/
      );
    });

    test('[P0] 缺少 secretKey 应抛出明确错误（使用显式 config）', () => {
      const config = {
        appKey: 'test_app_key',
        yopPublicKey: validPemPublicKey,
      } as YopConfig;

      expect(() => new YopClient(config)).toThrow(
        /secretKey is missing in the provided config object/
      );
    });

    test('[P2] YOP_PUBLIC_KEY_PATH 指向不存在的 .cer 文件应回退到默认文件', () => {
      process.env.YOP_APP_KEY = 'test_app_key';
      process.env.YOP_SECRET_KEY = mockSecretKey;
      process.env.YOP_PUBLIC_KEY_PATH = '/nonexistent/path/certificate.cer';

      // 应回退到默认证书文件并成功
      const client = new YopClient();

      // 验证成功加载了公钥（从默认文件）
      expect((client as any).config.yopPublicKey).toBeDefined();
      expect((client as any).config.yopPublicKey).toContain('BEGIN PUBLIC KEY');
    });

    test('[P2] YOP_PUBLIC_KEY_PATH 指向不存在的 .pem 文件应回退到默认文件', () => {
      process.env.YOP_APP_KEY = 'test_app_key';
      process.env.YOP_SECRET_KEY = mockSecretKey;
      process.env.YOP_PUBLIC_KEY_PATH = '/nonexistent/path/public_key.pem';

      // 应回退到默认证书文件并成功
      const client = new YopClient();

      // 验证成功加载了公钥（从默认文件）
      expect((client as any).config.yopPublicKey).toBeDefined();
      expect((client as any).config.yopPublicKey).toContain('BEGIN PUBLIC KEY');
    });

    test('[P2] YOP_PUBLIC_KEY_PATH 指向无权限访问的文件应回退到默认文件', () => {
      process.env.YOP_APP_KEY = 'test_app_key';
      process.env.YOP_SECRET_KEY = mockSecretKey;
      // 使用一个可能无权限访问的系统路径
      process.env.YOP_PUBLIC_KEY_PATH = '/root/secret/cert.cer';

      // 应回退到默认证书文件并成功
      const client = new YopClient();

      // 验证成功加载了公钥（从默认文件）
      expect((client as any).config.yopPublicKey).toBeDefined();
      expect((client as any).config.yopPublicKey).toContain('BEGIN PUBLIC KEY');
    });

    test('[P2] YOP_PUBLIC_KEY_PATH 指向空文件应回退到默认文件', () => {
      process.env.YOP_APP_KEY = 'test_app_key';
      process.env.YOP_SECRET_KEY = mockSecretKey;
      // 这个路径会导致文件读取错误或解析错误
      process.env.YOP_PUBLIC_KEY_PATH = '/dev/null';

      // 应回退到默认证书文件并成功
      const client = new YopClient();

      // 验证成功加载了公钥（从默认文件）
      expect((client as any).config.yopPublicKey).toBeDefined();
      expect((client as any).config.yopPublicKey).toContain('BEGIN PUBLIC KEY');
    });
  });

  describe('边缘情况处理', () => {
    test('[P2] 应处理空字符串环境变量（视为未设置）', () => {
      process.env.YOP_APP_KEY = 'test_app_key';
      process.env.YOP_SECRET_KEY = mockSecretKey;
      process.env.YOP_PUBLIC_KEY = ''; // 空字符串
      // 未设置 YOP_PUBLIC_KEY_PATH，应使用默认文件

      const client = new YopClient();

      // 空字符串的 YOP_PUBLIC_KEY 应被视为 falsy，回退到默认文件
      expect((client as any).config.yopPublicKey).toBeDefined();
      expect((client as any).config.yopPublicKey).toContain('BEGIN PUBLIC KEY');
    });

    test('[P2] 应处理 undefined 配置值（回退到环境变量）', () => {
      process.env.YOP_PUBLIC_KEY = validPemPublicKey;

      const config: YopConfig = {
        appKey: 'test_app_key',
        secretKey: mockSecretKey,
        yopPublicKey: undefined as any, // 明确设置为 undefined
      };

      const client = new YopClient(config);

      // undefined 的 yopPublicKey 应回退到环境变量
      expect((client as any).config.yopPublicKey).toBe(validPemPublicKey);
    });

    test('[P2] 应正确处理自定义 API Base URL', () => {
      const customBaseUrl = 'https://custom-api.example.com';
      process.env.YOP_API_BASE_URL = customBaseUrl;

      const config: YopConfig = {
        appKey: 'test_app_key',
        secretKey: mockSecretKey,
        yopPublicKey: validPemPublicKey,
      };

      const client = new YopClient(config);

      expect((client as any).config.yopApiBaseUrl).toBe(customBaseUrl);
    });

    test('[P3] 应正确处理带尾部斜杠的 Base URL', () => {
      const config: YopConfig = {
        appKey: 'test_app_key',
        secretKey: mockSecretKey,
        yopPublicKey: validPemPublicKey,
        yopApiBaseUrl: 'https://api.example.com/', // 带尾部斜杠
      };

      const client = new YopClient(config);

      // Base URL 应保持原样（URL 规范化在请求时处理）
      expect((client as any).config.yopApiBaseUrl).toBe('https://api.example.com/');
    });
  });

  describe('配置字段完整性', () => {
    test('[P1] 配置对象应包含所有必要字段', () => {
      const config: YopConfig = {
        appKey: 'test_app_key',
        secretKey: mockSecretKey,
        yopPublicKey: validPemPublicKey,
        yopApiBaseUrl: 'https://test-api.yeepay.com',
      };

      const client = new YopClient(config);
      const internalConfig = (client as any).config;

      expect(internalConfig.appKey).toBeDefined();
      expect(internalConfig.secretKey).toBeDefined();
      expect(internalConfig.yopPublicKey).toBeDefined();
      expect(internalConfig.yopApiBaseUrl).toBeDefined();
    });

    test('[P2] 应正确保存所有配置值（无修改）', () => {
      const config: YopConfig = {
        appKey: 'test_app_key',
        secretKey: mockSecretKey,
        yopPublicKey: validPemPublicKey,
        yopApiBaseUrl: 'https://test-api.yeepay.com',
      };

      const client = new YopClient(config);

      // 配置值应与输入完全一致
      expect((client as any).config.appKey).toBe(config.appKey);
      expect((client as any).config.secretKey).toBe(config.secretKey);
      expect((client as any).config.yopPublicKey).toBe(config.yopPublicKey);
      expect((client as any).config.yopApiBaseUrl).toBe(config.yopApiBaseUrl);
    });

    test('[P3] 配置对象应是不可变的（或至少独立于输入）', () => {
      const config: YopConfig = {
        appKey: 'original_app_key',
        secretKey: mockSecretKey,
        yopPublicKey: validPemPublicKey,
        yopApiBaseUrl: 'https://original-api.yeepay.com',
      };

      const client = new YopClient(config);

      // 修改原始配置对象
      config.appKey = 'modified_app_key';
      config.yopApiBaseUrl = 'https://modified-api.yeepay.com';

      // 客户端内部配置应不受影响
      expect((client as any).config.appKey).toBe('original_app_key');
      expect((client as any).config.yopApiBaseUrl).toBe('https://original-api.yeepay.com');
    });
  });

  describe('多实例隔离性', () => {
    test('[P2] 不同实例应有独立的配置', () => {
      const config1: YopConfig = {
        appKey: 'app_key_1',
        secretKey: mockSecretKey,
        yopPublicKey: validPemPublicKey,
      };

      const config2: YopConfig = {
        appKey: 'app_key_2',
        secretKey: mockSecretKey,
        yopPublicKey: validPemPublicKey,
      };

      const client1 = new YopClient(config1);
      const client2 = new YopClient(config2);

      expect((client1 as any).config.appKey).toBe('app_key_1');
      expect((client2 as any).config.appKey).toBe('app_key_2');
      expect((client1 as any).config.appKey).not.toBe((client2 as any).config.appKey);
    });

    test('[P2] 环境变量更改不应影响已创建的实例', () => {
      process.env.YOP_APP_KEY = 'initial_app_key';
      process.env.YOP_SECRET_KEY = mockSecretKey;
      process.env.YOP_PUBLIC_KEY = validPemPublicKey;

      const client = new YopClient();

      // 修改环境变量
      process.env.YOP_APP_KEY = 'modified_app_key';

      // 已创建的实例应保持原配置
      expect((client as any).config.appKey).toBe('initial_app_key');
    });
  });
});
