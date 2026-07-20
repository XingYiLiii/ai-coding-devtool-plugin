import * as vscode from "vscode";

import { BackendClient } from "./backend-client";
import { BackendHealthService } from "./backend-health-service";
import { getBackendStatusPresentation } from "./backend-status";

const outputChannelName = "AI Coding Devtool";
const backendBaseUrl = "http://127.0.0.1:8000";

export function activate(context: vscode.ExtensionContext): void {
  const outputChannel = vscode.window.createOutputChannel(outputChannelName);
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
  );
  const healthService = new BackendHealthService(
    new BackendClient({ baseUrl: backendBaseUrl }),
  );

  context.subscriptions.push(outputChannel, statusBarItem);
  outputChannel.appendLine("AI Coding Devtool extension activated.");
  statusBarItem.show();
  void updateBackendStatus(statusBarItem, healthService);
}

async function updateBackendStatus(
  statusBarItem: vscode.StatusBarItem,
  healthService: BackendHealthService,
): Promise<void> {
  const status = await healthService.check();
  const presentation = getBackendStatusPresentation(status);
  statusBarItem.text = presentation.text;
  statusBarItem.tooltip = presentation.tooltip;
}

export function deactivate(): void {}
