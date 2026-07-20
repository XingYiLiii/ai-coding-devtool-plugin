/** Command logic for generating a development plan from one user request. */

import type { DevelopmentPlanRequest, DevelopmentPlanResult } from "./backend-client";

export const generatePlanCommandId = "devpilot.generatePlan";

export interface DevelopmentPlanClient {
  generateDevelopmentPlan(
    request: DevelopmentPlanRequest,
  ): Promise<DevelopmentPlanResult>;
}

export interface DevelopmentPlanCommandRegistry {
  registerCommand(command: string, callback: () => Promise<void>): { dispose(): void };
}

export interface DevelopmentPlanOutputChannel {
  appendLine(value: string): void;
  show(preserveFocus?: boolean): void;
}

export interface GeneratePlanCommandDependencies {
  commands: DevelopmentPlanCommandRegistry;
  getRequestDescription(): PromiseLike<string | undefined>;
  client: DevelopmentPlanClient;
  outputChannel: DevelopmentPlanOutputChannel;
  showInformationMessage(message: string): void;
  showErrorMessage(message: string): void;
}

export function registerGeneratePlanCommand(
  dependencies: GeneratePlanCommandDependencies,
): { dispose(): void } {
  return dependencies.commands.registerCommand(generatePlanCommandId, async () => {
    const requestDescription = await dependencies.getRequestDescription();
    if (!requestDescription?.trim()) {
      dependencies.showInformationMessage("Development plan generation cancelled.");
      return;
    }

    try {
      const result = await dependencies.client.generateDevelopmentPlan({
        request_description: requestDescription,
      });
      writeDevelopmentPlan(dependencies.outputChannel, result);
      dependencies.showInformationMessage("Development plan generated.");
    } catch {
      dependencies.showErrorMessage("Unable to generate a development plan.");
    }
  });
}

function writeDevelopmentPlan(
  outputChannel: DevelopmentPlanOutputChannel,
  result: DevelopmentPlanResult,
): void {
  outputChannel.appendLine("Development Plan");
  outputChannel.appendLine(
    `Requirement understanding: ${result.requirement_understanding}`,
  );
  writeList(outputChannel, "Assumptions", result.assumptions);
  writeList(outputChannel, "Affected files", result.affected_files);
  writeList(outputChannel, "Implementation steps", result.implementation_steps);
  writeList(outputChannel, "Validation steps", result.validation_steps);
  writeList(outputChannel, "Risks", result.risks);
  writeList(outputChannel, "Out of scope", result.out_of_scope);
  outputChannel.show(true);
}

function writeList(
  outputChannel: DevelopmentPlanOutputChannel,
  heading: string,
  items: string[],
): void {
  outputChannel.appendLine(`${heading}:`);
  for (const item of items) {
    outputChannel.appendLine(`- ${item}`);
  }
}
