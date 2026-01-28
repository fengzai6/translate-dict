import { beforeEach, describe, expect, it } from "vitest";
import { convertToMarkdown } from "../utils/convert";
import { setMockConfig } from "../utils/platform";

describe("convertToMarkdown with custom platforms", () => {
  beforeEach(() => {
    // 重置 mock 配置
    setMockConfig(null);
  });

  it("应该使用默认的 Google 翻译链接", () => {
    const result = convertToMarkdown("xzcvzxvdv");
    expect(result).toContain(
      "[xzcvzxvdv](https://translate.google.com?text=xzcvzxvdv)"
    );
    expect(result).toContain("本地词库暂无结果");
    expect(result).toContain(
      "[Google翻译](https://translate.google.com?text=xzcvzxvdv)"
    );
    expect(result).toContain(
      "[百度翻译](https://fanyi.baidu.com/#en/zh/xzcvzxvdv)"
    );
    expect(result).toContain(
      "[DeepL翻译](https://www.deepl.com/translator#en/zh/xzcvzxvdv)"
    );
  });

  it("应该使用百度翻译作为默认平台", () => {
    setMockConfig({
      defaultTranslatePlatform: "baidu",
    });

    const result = convertToMarkdown("xzcvzxvdv");
    expect(result).toContain(
      "[xzcvzxvdv](https://fanyi.baidu.com/#en/zh/xzcvzxvdv)"
    );
  });

  it("应该使用自定义翻译平台", () => {
    setMockConfig({
      defaultTranslatePlatform: "custom",
      customTranslateUrl: "https://custom.com/translate?q={word}",
    });

    const result = convertToMarkdown("xzcvzxvdv");
    expect(result).toContain(
      "[xzcvzxvdv](https://custom.com/translate?q=xzcvzxvdv)"
    );
  });

  it("应该在中译英没有结果时显示翻译平台链接", () => {
    const result = convertToMarkdown("不存在的中文词汇");
    expect(result).toContain("本地词库暂无匹配的英文单词");
    expect(result).toContain(
      "[Google翻译](https://translate.google.com?text=%E4%B8%8D%E5%AD%98%E5%9C%A8%E7%9A%84%E4%B8%AD%E6%96%87%E8%AF%8D%E6%B1%87)"
    );
    expect(result).toContain(
      "[百度翻译](https://fanyi.baidu.com/#en/zh/%E4%B8%8D%E5%AD%98%E5%9C%A8%E7%9A%84%E4%B8%AD%E6%96%87%E8%AF%8D%E6%B1%87)"
    );
    expect(result).toContain(
      "[DeepL翻译](https://www.deepl.com/translator#en/zh/%E4%B8%8D%E5%AD%98%E5%9C%A8%E7%9A%84%E4%B8%AD%E6%96%87%E8%AF%8D%E6%B1%87)"
    );
  });

  it("应该正确处理 URL 编码", () => {
    const result = convertToMarkdown("hello world");
    expect(result).toContain("hello%20world");
  });
});
