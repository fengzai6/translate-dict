import { TRANSLATE_PLATFORMS } from "../constants";

// 用于测试环境的 mock 配置
let mockConfig: Record<string, unknown> | null = null;

/**
 * 设置 mock 配置（用于测试）
 */
export function setMockConfig(config: Record<string, unknown> | null): void {
  mockConfig = config;
}

/**
 * 获取配置值
 */
function getConfigValue<T>(key: string, defaultValue: T): T {
  if (mockConfig) {
    const value = mockConfig[key];
    return value !== undefined ? (value as T) : defaultValue;
  }

  try {
    // 动态导入 vscode，避免在测试环境中出错
    const vscode = require("vscode");
    const config = vscode.workspace.getConfiguration("translateDict");
    return config.get(key, defaultValue);
  } catch {
    // 在测试环境中返回默认值
    return defaultValue;
  }
}

/**
 * 获取翻译平台URL
 */
function getPlatformUrl(platform: string, word: string): string {
  const encodedWord = encodeURIComponent(word);

  if (platform === "custom") {
    const customUrl = getConfigValue<string>(
      "customTranslateUrl",
      TRANSLATE_PLATFORMS[0].url
    );
    return customUrl.replace(/{word}/g, encodedWord);
  }

  const platformConfig = TRANSLATE_PLATFORMS.find((p) => p.key === platform);
  if (platformConfig) {
    return platformConfig.url.replace(/{word}/g, encodedWord);
  }

  // 默认使用第一个平台（Google）
  return TRANSLATE_PLATFORMS[0].url.replace(/{word}/g, encodedWord);
}

/**
 * 获取默认平台的链接URL
 */
export function getDefaultPlatformUrl(word: string): string {
  const defaultPlatform = getConfigValue<string>(
    "defaultTranslatePlatform",
    "google"
  );
  return getPlatformUrl(defaultPlatform, word);
}

/**
 * 生成所有平台的链接文本（当本地词库无结果时显示）
 */
export function generatePlatformLinks(word: string): string {
  return TRANSLATE_PLATFORMS.map((platform) => {
    const url = platform.url.replace(/{word}/g, encodeURIComponent(word));
    return `[${platform.name}](${url})`;
  }).join(" ");
}
