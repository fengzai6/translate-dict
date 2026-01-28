# Change Log

All notable changes to the "translate-dict" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [1.2.3] - 2026-01-28

### 新功能

- feat: 自定义外部翻译平台跳转功能
  - 支持选择默认翻译平台：Google翻译、百度翻译、DeepL翻译、必应翻译、Yandex翻译
  - 支持自定义翻译平台URL，使用 `{word}` 作为单词占位符
  - 当本地词库无结果时，自动显示所有翻译平台的跳转链接
  - 中译英无结果时也会显示翻译平台链接

## [1.2.1] - 2026-01-09

### 新功能

- feat: 中译英功能 - 支持通过本地词典反向查询，选中中文文本即可查看对应的英文单词

## [1.2.0] - 2025-12-19

### 新功能

- feat: 文件扩展名过滤配置
- feat: 全局翻译开关和右键菜单

### 重构

- refactor: 重构单词拆分和查询逻辑，合并为 `parseAndQuery` 一步完成
- refactor: 优化词典查询，支持多种大小写变体匹配（原文 → 小写 → 首字母大写 → 缩写形式 → 全大写）

### 改进

- improve: 改进连续大写字母处理，如 `HTTPServer` → `["HTTP", "Server"]`
- improve: 改进单字母前缀处理，如 `IHTTPService` → `["HTTP", "Service"]`（自动过滤单字母）
- improve: 支持缩写形式匹配，如 `Ht` 可匹配到 `Ht.`
- improve: 保留原始大小写进行查询，提高匹配准确性

## [1.1.2] - 2025-12-18

- Migrate: Build with rollup+typescript，Reduce the packing volume

## [1.1.0] - 2025-12-16

- Change: +398,567 words
