/** Command logic for explaining only the current editor selection. */

import type { ExplainCodeRequest, ExplainCodeResult } from "./backend-client";

export const explainCodeCommandId = "devpilot.explainCode";

export interface ExplainCodeClient {
  explainCode(request: ExplainCodeRequest): Promise<ExplainCodeResult>;
}

export interface ExplainCodeSelection {
  code: string;
  language: string;
  filePath?: string;
}

export interface CommandRegistry {
  registerCommand(command: string, callback: () => Promise<void>): { dispose(): void };
}

export interface ExplainCodeOutputChannel {
  appendLine(value: string): void;
  show(preserveFocus?: boolean): void;
}

export interface ExplainCodeCommandDependencies {
  commands: CommandRegistry;
  getSelection(): ExplainCodeSelection | undefined;
  client: ExplainCodeClient;
  outputChannel: ExplainCodeOutputChannel;
  showWarningMessage(message: string): void;
  showInformationMessage(message: string): void;
  showErrorMessage(message: string): void;
}

export function registerExplainCodeCommand(
  dependencies: ExplainCodeCommandDependencies,
): { dispose(): void } {
  return dependencies.commands.registerCommand(explainCodeCommandId, async () => {
    const selection = dependencies.getSelection();
    if (!selection || !selection.code.trim()) {
      dependencies.showWarningMessage("Select code to explain first.");
      return;
    }

    try {
      const result = await dependencies.client.explainCode({
        code: selection.code,
        language: selection.language,
        ...(selection.filePath ? { metadata: { path: selection.filePath } } : {}),
      });
      writeExplanation(dependencies.outputChannel, result);
      dependencies.showInformationMessage("Code explanation generated.");
    } catch {
      dependencies.showErrorMessage("Unable to explain the selected code.");
    }
  });
}

function writeExplanation(
  outputChannel: ExplainCodeOutputChannel,
  result: ExplainCodeResult,
): void {
  outputChannel.appendLine("Explain Code");
  outputChannel.appendLine(`Summary: ${result.summary}`);
  outputChannel.appendLine(`Explanation: ${result.explanation}`);
  outputChannel.appendLine("Key points:");
  for (const point of result.key_points) {
    outputChannel.appendLine(`- ${point}`);
  }
  outputChannel.appendLine("Risks:");
  for (const risk of result.risks) {
    outputChannel.appendLine(`- ${risk}`);
  }
  outputChannel.show(true);
}
