import * as vscode from "vscode";

const outputChannelName = "AI Coding Devtool";

export function activate(context: vscode.ExtensionContext): void {
  const outputChannel = vscode.window.createOutputChannel(outputChannelName);

  context.subscriptions.push(outputChannel);
  outputChannel.appendLine("AI Coding Devtool extension activated.");
}

export function deactivate(): void {}
