export const MARKDOWN_HEADER = `翻译 \`$word\` :  
`;
export const MARKDOWN_FOOTER = `  
`;
export const MARKDOWN_LINE = `  
*****
`;

/**
 * 翻译平台配置
 */
export const TRANSLATE_PLATFORMS = [
  {
    key: "google",
    name: "Google翻译",
    url: "https://translate.google.com?text={word}",
  },
  {
    key: "baidu",
    name: "百度翻译",
    url: "https://fanyi.baidu.com/#en/zh/{word}",
  },
  {
    key: "deepl",
    name: "DeepL翻译",
    url: "https://www.deepl.com/translator#en/zh/{word}",
  },
  {
    key: "bing",
    name: "必应翻译",
    url: "https://www.bing.com/translator?text={word}&from=en&to=zh-Hans",
  },
  {
    key: "yandex",
    name: "Yandex翻译",
    url: "https://translate.yandex.com/?text={word}&lang=en-zh",
  },
] as const;
