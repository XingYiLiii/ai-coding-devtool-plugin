import * as vscode from "vscode";

import { BackendClient } from "./backend-client";
import { BackendHealthService } from "./backend-health-service";
import {
  registerExplainCodeCommand,
  type ExplainCodeSelection,
} from "./explain-code-command";
import { registerGeneratePlanCommand } from "./generate-plan-command";
import { GitContextCollector } from "./git-context";
import { registerGitWorkflowCommands } from "./git-workflow-commands";
import { getBackendStatusPresentation } from "./backend-status";
import { VsCodeGitContextSource } from "./vscode-git-context-source";

const outputChannelName = "AI Coding Devtool";
const defaultBackendUrl = "http://127.0.0.1:8000";

export function activate(context: vscode.ExtensionContext): void {
  const outputChannel = vscode.window.createOutputChannel(outputChannelName);
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
  );
  const backendClient = new BackendClient({ baseUrl: getBackendUrl() });
  const healthService = new BackendHealthService(backendClient);
  const gitContextCollector = new GitContextCollector(new VsCodeGitContextSource());
  const checkingPresentation = getBackendStatusPresentation("checking");

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
    registerGeneratePlanCommand({
      commands: vscode.commands,
      getRequestDescription: () =>
        vscode.window.showInputBox({
          prompt: "Describe the development work to plan.",
          placeHolder: "For example: Add a profile endpoint.",
          ignoreFocusOut: true,
        }),
      client: backendClient,
      outputChannel,
      showInformationMessage: (message) =>
        void vscode.window.showInformationMessage(message),
      showErrorMessage: (message) => void vscode.window.showErrorMessage(message),
    }),
    ...registerGitWorkflowCommands({
      commands: vscode.commands,
      collector: gitContextCollector,
      client: backendClient,
      outputChannel,
      showInformationMessage: (message) =>
        void vscode.window.showInformationMessage(message),
      showErrorMessage: (message) => void vscode.window.showErrorMessage(message),
    }),
  );
  outputChannel.appendLine("AI Coding Devtool extension activated.");
  statusBarItem.text = checkingPresentation.text;
  statusBarItem.tooltip = checkingPresentation.tooltip;
  statusBarItem.show();
  void updateBackendStatus(statusBarItem, healthService);
}

function getBackendUrl(): string {
  const configuredUrl = vscode.workspace
    .getConfiguration("devpilot")
    .get<string>("backendUrl", defaultBackendUrl)
    .trim();
  return configuredUrl || defaultBackendUrl;
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
