import * as vscode from "vscode";
import type { OnlineTranslateApi } from "./onlineTranslate";

export type TranslationMode = "hover" | "shortcut";

/**
 * 读取当前翻译模式配置
 */
export function getTranslationMode(): TranslationMode {
  const config = vscode.workspace.getConfiguration("translateDict");
  return config.get<TranslationMode>("translationMode", "hover");
}

/**
 * 读取新 hover 默认展开状态
 */
export function getDefaultHoverExpanded(
  config: vscode.WorkspaceConfiguration
): boolean {
  return config.get<boolean>("defaultHoverExpanded", true);
}

/**
 * 根据配置获取在线回退 API 列表（按优先级排序）
 */
export function getOnlineFallbackApis(
  config: vscode.WorkspaceConfiguration
): OnlineTranslateApi[] {
  const apiSetting = config.get<string>("onlineFallbackApi", "auto");
  if (apiSetting === "google") return ["google"];
  if (apiSetting === "yandex") return ["yandex"];
  // auto：谷歌优先，失败则 Yandex
  return ["google", "yandex"];
}

/**
 * 规范化文件扩展名，统一为小写且不含点号
 */
export function normalizeFileExtension(fileName: string): string {
  const lastDotIndex = fileName.lastIndexOf(".");
  if (lastDotIndex === -1) {
    return "";
  }
  return fileName.substring(lastDotIndex + 1).toLowerCase();
}

/**
 * 将配置中的扩展名列表规范化为小写
 */
export function normalizeExtensionList(extensions: string[]): string[] {
  return extensions.map((ext) => ext.replace(/^\./, "").toLowerCase());
}
