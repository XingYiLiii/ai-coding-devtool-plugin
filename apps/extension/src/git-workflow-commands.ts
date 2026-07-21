/** Commands that turn safe staged Git context into backend AI suggestions. */

import type {
  ChangeReviewRequest,
  ChangeReviewResult,
  CommitMessageRequest,
  CommitMessageResult,
} from "./backend-client";
import type { GitContextCollectionResult } from "./git-context";

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
        dependencies.showInformationMessage("Commit message suggestion generated.");
      } catch {
        dependencies.showErrorMessage(
          "Unable to generate a commit message suggestion.",
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
        dependencies.showInformationMessage("Change review generated.");
      } catch {
        dependencies.showErrorMessage("Unable to review staged changes.");
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
  dependencies.showInformationMessage(collection.message);
  return false;
}

function writeCommitMessage(
  outputChannel: GitWorkflowOutputChannel,
  result: CommitMessageResult,
): void {
  outputChannel.appendLine("Commit Message Suggestion");
  outputChannel.appendLine(`Subject: ${result.subject}`);
  outputChannel.appendLine(`Commit type: ${result.commit_type}`);
  outputChannel.appendLine(`Body: ${result.body}`);
  outputChannel.show(true);
}

function writeChangeReview(
  outputChannel: GitWorkflowOutputChannel,
  result: ChangeReviewResult,
): void {
  outputChannel.appendLine("Change Review");
  outputChannel.appendLine(`Summary: ${result.summary}`);
  outputChannel.appendLine("Findings:");
  if (!result.findings.length) {
    outputChannel.appendLine("- No clear findings.");
  }
  for (const finding of result.findings) {
    outputChannel.appendLine(
      `- [${finding.severity}] ${finding.file}:${finding.line} ${finding.problem}`,
    );
    outputChannel.appendLine(`  Evidence: ${finding.evidence}`);
    outputChannel.appendLine(`  Suggestion: ${finding.suggestion}`);
  }
  outputChannel.appendLine("Testing recommendations:");
  for (const recommendation of result.testing_recommendations) {
    outputChannel.appendLine(`- ${recommendation}`);
  }
  outputChannel.show(true);
}
