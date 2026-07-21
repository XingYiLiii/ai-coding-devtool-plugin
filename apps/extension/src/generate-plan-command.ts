/** Command logic for generating a development plan from one user request. */

import type { DevelopmentPlanRequest, DevelopmentPlanResult } from "./backend-client";
import { writeMarkdownResult } from "./output-format";
import { getBackendErrorMessage } from "./user-messages";

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
      dependencies.showInformationMessage(
        "DevPilot: Development plan generation cancelled.",
      );
      return;
    }

    try {
      const result = await dependencies.client.generateDevelopmentPlan({
        request_description: requestDescription,
      });
      writeDevelopmentPlan(dependencies.outputChannel, result);
      dependencies.showInformationMessage("DevPilot: Development plan generated.");
    } catch (error) {
      dependencies.showErrorMessage(
        getBackendErrorMessage(error, "generate a development plan"),
      );
    }
  });
}

function writeDevelopmentPlan(
  outputChannel: DevelopmentPlanOutputChannel,
  result: DevelopmentPlanResult,
): void {
  writeMarkdownResult(outputChannel, "Development Plan", [
    {
      heading: "Requirement understanding",
      items: [result.requirement_understanding],
    },
    { heading: "Assumptions", items: result.assumptions },
    { heading: "Affected files", items: result.affected_files },
    { heading: "Implementation steps", items: result.implementation_steps },
    { heading: "Validation steps", items: result.validation_steps },
    { heading: "Risks", items: result.risks, emptyText: "No clear risks." },
    { heading: "Out of scope", items: result.out_of_scope },
  ]);
}
