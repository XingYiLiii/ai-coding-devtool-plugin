import * as vscode from "vscode";

import { BackendClient } from "./backend-client";
import { BackendHealthService } from "./backend-health-service";
import {
  registerExplainCodeCommand,
  type ExplainCodeSelection,
} from "./explain-code-command";
import { getBackendStatusPresentation } from "./backend-status";

const outputChannelName = "AI Coding Devtool";
const backendBaseUrl = "http://127.0.0.1:8000";

export function activate(context: vscode.ExtensionContext): void {
  const outputChannel = vscode.window.createOutputChannel(outputChannelName);
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
  );
  const backendClient = new BackendClient({ baseUrl: backendBaseUrl });
  const healthService = new BackendHealthService(backendClient);

  context.subscriptions.push(
    outputChannel,
    statusBarItem,
    registerExplainCodeCommand({
      commands: vscode.commands,
      getSelection: getActiveSelection,
      client: backendClient,
      outputChannel,
      showWarningMessage: (message) => void vscode.window.showWarningMessage(message),
      showInformationMessage: (message) =>
        void vscode.window.showInformationMessage(message),
      showErrorMessage: (message) => void vscode.window.showErrorMessage(message),
    }),
  );
  outputChannel.appendLine("AI Coding Devtool extension activated.");
  statusBarItem.show();
  void updateBackendStatus(statusBarItem, healthService);
}

function getActiveSelection(): ExplainCodeSelection | undefined {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.selection.isEmpty) {
    return undefined;
  }

  const code = editor.document.getText(editor.selection);
  return {
    code,
    language: editor.document.languageId,
    ...(editor.document.uri.scheme === "file"
      ? { filePath: editor.document.uri.fsPath }
      : {}),
  };
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
