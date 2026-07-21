/** Command logic for explaining only the current editor selection. */

import type { ExplainCodeRequest, ExplainCodeResult } from "./backend-client";
import { getBackendErrorMessage } from "./user-messages";
import { writeMarkdownResult } from "./output-format";

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
      dependencies.showWarningMessage("DevPilot: Select code to explain first.");
      return;
    }

    try {
      const result = await dependencies.client.explainCode({
        code: selection.code,
        language: selection.language,
        ...(selection.filePath ? { metadata: { path: selection.filePath } } : {}),
      });
      writeExplanation(dependencies.outputChannel, result);
      dependencies.showInformationMessage("DevPilot: Code explanation generated.");
    } catch (error) {
      dependencies.showErrorMessage(
        getBackendErrorMessage(error, "explain the selected code"),
      );
    }
  });
}

function writeExplanation(
  outputChannel: ExplainCodeOutputChannel,
  result: ExplainCodeResult,
): void {
  writeMarkdownResult(outputChannel, "Explain Code", [
    { heading: "Summary", items: [result.summary] },
    { heading: "Explanation", items: [result.explanation] },
    { heading: "Key points", items: result.key_points },
    { heading: "Risks", items: result.risks, emptyText: "No clear risks." },
  ]);
}
