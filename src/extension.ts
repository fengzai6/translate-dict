import * as vscode from "vscode";
import { init } from "./index";

/**
 * 插件激活时调用
 */
export function activate(context: vscode.ExtensionContext): void {
  init(context);
}

/**
 * 插件停用时调用
 */
export function deactivate(): void {
  // 清理资源
}
