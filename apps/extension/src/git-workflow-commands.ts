/** Commands that turn safe staged Git context into backend AI suggestions. */

import type {
  ChangeReviewRequest,
  ChangeReviewResult,
  CommitMessageRequest,
  CommitMessageResult,
} from "./backend-client";
import type { GitContextCollectionResult } from "./git-context";
import { writeMarkdownResult } from "./output-format";
import { getBackendErrorMessage } from "./user-messages";

export const generateCommitMessageCommandId = "devpilot.generateCommitMessage";
export const reviewChangesCommandId = "devpilot.reviewChanges";

export interface GitWorkflowClient {
  generateCommitMessage(request: CommitMessageRequest): Promise<CommitMessageResult>;
  reviewChanges(request: ChangeReviewRequest): Promise<ChangeReviewResult>;
}

export interface GitContextCollectorLike {
  collect(): Promise<GitContextCollectionResult>;
}

export interface GitWorkflowCommandRegistry {
  registerCommand(command: string, callback: () => Promise<void>): { dispose(): void };
}

export interface GitWorkflowOutputChannel {
  appendLine(value: string): void;
  show(preserveFocus?: boolean): void;
}

export interface GitWorkflowCommandDependencies {
  commands: GitWorkflowCommandRegistry;
  collector: GitContextCollectorLike;
  client: GitWorkflowClient;
  outputChannel: GitWorkflowOutputChannel;
  showInformationMessage(message: string): void;
  showErrorMessage(message: string): void;
}

export function registerGitWorkflowCommands(
  dependencies: GitWorkflowCommandDependencies,
): { dispose(): void }[] {
  return [
    dependencies.commands.registerCommand(generateCommitMessageCommandId, async () => {
      const collection = await dependencies.collector.collect();
      if (!hasReadyContext(collection, dependencies)) {
        return;
      }

      try {
        const result = await dependencies.client.generateCommitMessage({
          diff_summary: collection.context.diff,
          changed_files: collection.context.changedFiles,
        });
        writeCommitMessage(dependencies.outputChannel, result);
        dependencies.showInformationMessage(
          "DevPilot: Commit message suggestion generated.",
        );
      } catch (error) {
        dependencies.showErrorMessage(
          getBackendErrorMessage(error, "generate a commit message suggestion"),
        );
      }
    }),
    dependencies.commands.registerCommand(reviewChangesCommandId, async () => {
      const collection = await dependencies.collector.collect();
      if (!hasReadyContext(collection, dependencies)) {
        return;
      }

      try {
        const result = await dependencies.client.reviewChanges({
          diff: collection.context.diff,
        });
        writeChangeReview(dependencies.outputChannel, result);
        dependencies.showInformationMessage("DevPilot: Change review generated.");
      } catch (error) {
        dependencies.showErrorMessage(
          getBackendErrorMessage(error, "review staged changes"),
        );
      }
    }),
  ];
}

function hasReadyContext(
  collection: GitContextCollectionResult,
  dependencies: GitWorkflowCommandDependencies,
): collection is Extract<GitContextCollectionResult, { kind: "ready" }> {
  if (collection.kind === "ready") {
    return true;
  }
  dependencies.showInformationMessage(`DevPilot: ${collection.message}`);
  return false;
}

function writeCommitMessage(
  outputChannel: GitWorkflowOutputChannel,
  result: CommitMessageResult,
): void {
  writeMarkdownResult(outputChannel, "Commit Message Suggestion", [
    { heading: "Subject", items: [result.subject] },
    { heading: "Commit type", items: [result.commit_type] },
    { heading: "Body", items: [result.body] },
  ]);
}

function writeChangeReview(
  outputChannel: GitWorkflowOutputChannel,
  result: ChangeReviewResult,
): void {
  const findings = result.findings.flatMap((finding) => [
    `[${finding.severity}] ${finding.file}:${finding.line} ${finding.problem}`,
    `Evidence: ${finding.evidence}`,
    `Suggestion: ${finding.suggestion}`,
  ]);
  writeMarkdownResult(outputChannel, "Change Review", [
    { heading: "Summary", items: [result.summary] },
    {
      heading: "Findings",
      items: findings,
      emptyText: "No clear findings.",
    },
    {
      heading: "Testing recommendations",
      items: result.testing_recommendations,
    },
  ]);
}
