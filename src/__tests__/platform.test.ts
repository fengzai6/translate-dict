import { beforeEach, describe, expect, it } from "vitest";
import {
  generatePlatformLinks,
  getDefaultPlatformUrl,
  setMockConfig,
} from "../utils/platform";

describe("platform utils", () => {
  beforeEach(() => {
    // 重置 mock 配置
    setMockConfig(null);
  });

  describe("getDefaultPlatformUrl", () => {
    it("应该返回 Google 翻译 URL 作为默认", () => {
      const url = getDefaultPlatformUrl("hello");
      expect(url).toBe("https://translate.google.com?text=hello");
    });

    it("应该返回百度翻译 URL", () => {
      setMockConfig({
        defaultTranslatePlatform: "baidu",
      });

      const url = getDefaultPlatformUrl("hello");
      expect(url).toBe("https://fanyi.baidu.com/#en/zh/hello");
    });

    it("应该返回自定义翻译 URL", () => {
      setMockConfig({
        defaultTranslatePlatform: "custom",
        customTranslateUrl: "https://example.com/translate?q={word}",
      });

      const url = getDefaultPlatformUrl("hello");
      expect(url).toBe("https://example.com/translate?q=hello");
    });

    it("应该正确处理 URL 编码", () => {
      const url = getDefaultPlatformUrl("hello world");
      expect(url).toBe("https://translate.google.com?text=hello%20world");
    });

    it("当平台类型未知时应该回退到 Google", () => {
      setMockConfig({
        defaultTranslatePlatform: "unknown",
      });

      const url = getDefaultPlatformUrl("hello");
      expect(url).toBe("https://translate.google.com?text=hello");
    });
  });

  describe("generatePlatformLinks", () => {
    it("应该生成所有翻译平台的链接", () => {
      const links = generatePlatformLinks("hello");
      expect(links).toContain(
        "[Google翻译](https://translate.google.com?text=hello)"
      );
      expect(links).toContain(
        "[百度翻译](https://fanyi.baidu.com/#en/zh/hello)"
      );
      expect(links).toContain(
        "[DeepL翻译](https://www.deepl.com/translator#en/zh/hello)"
      );
      expect(links).toContain(
        "[必应翻译](https://www.bing.com/translator?text=hello&from=en&to=zh-Hans)"
      );
      expect(links).toContain(
        "[Yandex翻译](https://translate.yandex.com/?text=hello&lang=en-zh)"
      );
    });

    it("应该正确处理 URL 编码", () => {
      const links = generatePlatformLinks("hello world");
      expect(links).toContain("hello%20world");
    });
  });
});
