# Translate Dict for VS Code

<p align="center">
  <img src="icon.png" width="128" alt="Translate Dict Logo" />
</p>

一款纯粹、极速、无侵入的 VS Code 滑词翻译插件，基于 **ECDICT** 本地词库构建。

[![Version](https://img.shields.io/visual-studio-marketplace/v/fengzai6.translate-dict?style=flat-square&logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=fengzai6.translate-dict)
![Installs](https://img.shields.io/visual-studio-marketplace/i/fengzai6.translate-dict?style=flat-square)
![Downloads](https://img.shields.io/visual-studio-marketplace/d/fengzai6.translate-dict?style=flat-square)
![Open VSX Downloads](https://img.shields.io/open-vsx/dt/fengzai6/translate-dict)
![Rating](https://img.shields.io/visual-studio-marketplace/r/fengzai6.translate-dict?style=flat-square)
![GitHub Repo stars](https://img.shields.io/github/stars/fengzai6/translate-dict?style=flat-square&logo=github)
[![License](https://img.shields.io/badge/license-MIT-orange.svg?style=flat-square)](http://opensource.org/licenses/MIT)

---

**📥 安装地址：**

- [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=fengzai6.translate-dict)
- [Open VSX Registry](https://open-vsx.org/extension/fengzai6/translate-dict)

---

## 🚀 核心特性

- **🌍 纯正本地加速**: 内置 76 万+ 离线单词（基于 [ECDICT](https://github.com/skywind3000/ECDICT)），完全脱离网络限制，隐私安全且极速响应。
- **⚡️ 极致性能**: 单词查询平均耗时小于 **10ms**，反向查询（中译英）约 **160-200ms**，丝滑无感。
- **🔗 外部翻译平台跳转**: 支持多种翻译平台（Google、百度、DeepL等），本地无结果时自动提供外部翻译链接。
- **🌐 在线回退翻译**: 开启后，当本地词库无结果时自动通过 Google / Yandex 在线 API 获取翻译，无缝补全缺失词汇（默认关闭，请在设置中开启）。
- **🖱 灵活触发模式**: 支持「悬浮即翻译」和「选中+快捷键（`Alt+T`）翻译」两种模式，可随时切换。
- **🧠 智能代码拆分**: 完美识别编程常用的命名格式：
  - 处理 `camelCase`, `PascalCase`, `snake_case`, `kebab-case`。
  - 智能解析组合词（如 `audioinput` → `audio` + `input`，`superuserprofilemanager` → `superuser` + `profile` + `manager`）。
  - 处理连续大写缩写（如 `HTTPServer` → `HTTP` + `Server`，`getURLForHTTPAPI` → `get` + `URL` + `For` + `HTTP` + `API`）。
  - 自动过滤常见接口前缀（如 `IUser` → `User`，`IUserDTOService` → `User` + `DTO` + `Service`）。
- **🔍 双向翻译**:
  - **英译中**: 悬停直接显示，支持单词、短语及各种大小写变体。
  - **中译英**: 选中中文文本悬停，智能匹配最佳英文释义（支持得分排序）。
- **💻 全平台覆盖**: 完美支持 VS Code 桌面端及 VS Code Online 网页版。

---

## 🛠 功能演示

### 1. 悬停翻译 (Hover Translation)

只需将鼠标悬停在单词上，即可查看详细释义、音标及词频等级。信息框顶部有 **▼ 折叠词典** / **▶ 展开词典**。点击只影响当前单词，不会改全局设置。
![悬停翻译](assets/Snipaste_01.png)

### 2. 智能单词拆分 (Smart Word Splitting)

自动识别并拆分复杂的变量名、类名、技术缩写及组合词，助力理解代码逻辑。
![单词拆分](assets/Snipaste_02.png)

### 3. 中译英支持 (Chinese to English)

选中中文后悬停，系统将基于本地词库反向查找最匹配的英文选项。
![中译英](assets/Snipaste_05.png)

### 4. 在线回退翻译 (Online Fallback Translation)

当本地词库无结果时，自动通过 Google / Yandex 在线 API 获取翻译，无缝补全缺失词汇（默认关闭，请在设置中开启）。
![在线回退翻译](assets/Snipaste_06.png)

### 5. 外部翻译平台跳转 (External Translation Links)

当本地词库无结果时，自动提供多个翻译平台的跳转链接，包括Google翻译、百度翻译、DeepL翻译等，确保用户始终能获得准确的翻译结果。

**支持的翻译平台：**

- 🌐 Google翻译 - 全球通用
- 🇨🇳 百度翻译 - 中文优化
- 🤖 DeepL翻译 - AI高质量
- 🔍 必应翻译 - 微软出品
- 🌍 Yandex翻译 - 俄罗斯的翻译服务
- ⚙️ 自定义平台 - 支持任意翻译网站

---

## ⚙️ 配置选项

进入 VS Code 设置，搜索 `Translate Dict` 即可进行如下个性化配置：

| 配置项                                     | 类型    | 默认值                                     | 说明                                                                                         |
| :----------------------------------------- | :------ | :----------------------------------------- | :------------------------------------------------------------------------------------------- |
| `translateDict.includeFileExtensions`      | Array   | `[]`                                       | **启用** 翻译的文件扩展名。若为空则对所有文件生效。如 `["js", "ts"]`                         |
| `translateDict.excludeFileExtensions`      | Array   | `[]`                                       | **禁用** 翻译的文件扩展名。如 `["json", "md"]`                                               |
| `translateDict.chineseToEnglishMaxResults` | Number  | `10`                                       | 中译英时显示的候选结果最大数量 (范围: 1-50)                                                  |
| `translateDict.defaultTranslatePlatform`   | String  | `google`                                   | 默认翻译平台，用于单词链接跳转。可选：`google`、`baidu`、`deepl`、`bing`、`yandex`、`custom` |
| `translateDict.customTranslateUrl`         | String  | `https://fanyi.baidu.com/#en/zh/{word}`    | 自定义翻译平台URL模板，使用 `{word}` 作为单词占位符                                          |
| `translateDict.translationMode`            | String  | `hover`                                    | 翻译触发模式：`hover`（悬浮即翻译）或 `shortcut`（选中后按 `Alt+T` 触发）                    |
| `translateDict.autoExpandHover`            | Boolean | `true`                                     | 词典释义默认是否展开。点击 ▶ / ▼ 只切换当前信息框，不会改写本设置                             |
| `translateDict.enableOnlineFallback`       | Boolean | `false`                                    | 本地词库无结果时，是否自动调用在线 API 回退翻译（需要网络）                                  |
| `translateDict.onlineFallbackApi`          | String  | `auto`                                     | 在线回退使用的 API：`auto`（Google 优先，失败换 Yandex）、`google`、`yandex`                 |

### 快速开关 / 模式切换

你可以通过以下任一方式快速启用/禁用插件或切换翻译模式：

1. **编辑器右键菜单**: 右键 -> `Translate Dict` -> `启用 / 禁用 / 切换翻译触发模式`。
2. **命令面板**: `Ctrl+Shift+P` (Win/Linux) 或 `Cmd+Shift+P` (Mac)，输入 `Translate Dict`。
3. **快捷键**: 在 `shortcut` 模式下，选中文本后按 `Alt+T` 触发翻译。

---

## 📝 待办事项 (TODO)

- [x] 智能文件过滤（Include/Exclude）
- [x] 全局开关控制
- [x] 组合词深度解析（audioinput 等）
- [x] 本地反向查询（中译英）
- [x] 自定义外部翻译平台跳转
- [x] 翻译触发模式切换（hover / shortcut Alt+T）
- [x] 当无结果时尝试通过API获取翻译结果

---

## 🤝 致谢

- 词库来源：[ECDICT](https://github.com/skywind3000/ECDICT)
- 核心灵感：[Code Translate](https://github.com/w88975/code-translate-vscode)

## 📄 开源协议

基于 [MIT](LICENSE) 协议。
