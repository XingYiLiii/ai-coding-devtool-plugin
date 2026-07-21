import assert from "node:assert/strict";
import { test } from "node:test";

import {
  generateCommitMessageCommandId,
  registerGitWorkflowCommands,
  reviewChangesCommandId,
  type GitWorkflowCommandDependencies,
  type GitWorkflowCommandRegistry,
} from "../src/git-workflow-commands";

interface CommandHarness {
  callbacks: Map<string, () => Promise<void>>;
}

function createDependencies(overrides: Partial<GitWorkflowCommandDependencies> = {}): {
  dependencies: GitWorkflowCommandDependencies;
  harness: CommandHarness;
  lines: string[];
} {
  const harness: CommandHarness = { callbacks: new Map() };
  const lines: string[] = [];
  const commands: GitWorkflowCommandRegistry = {
    registerCommand: (command, callback) => {
      harness.callbacks.set(command, callback);
      return { dispose: () => undefined };
    },
  };
  const dependencies: GitWorkflowCommandDependencies = {
    commands,
    collector: {
      collect: async () => ({
        kind: "ready",
        context: {
          repositoryRoot: "C:/workspace",
          diff: "diff --git a/src/main.py b/src/main.py\n+print('ok')",
          changedFiles: ["src/main.py"],
        },
      }),
    },
    client: {
      generateCommitMessage: async () => ({
        subject: "feat: add output",
        body: "Add console output.",
        commit_type: "feat",
        breaking_change: false,
        reasoning: "Adds a feature.",
      }),
      reviewChanges: async () => ({
        summary: "No clear defects.",
        findings: [],
        testing_recommendations: ["Run the unit tests."],
      }),
    },
    outputChannel: {
      appendLine: (line) => lines.push(line),
      show: () => undefined,
    },
    showInformationMessage: () => undefined,
    showErrorMessage: () => undefined,
    ...overrides,
  };
  return { dependencies, harness, lines };
}

test("registers both Git workflow commands", () => {
  const { dependencies, harness } = createDependencies();

  const disposables = registerGitWorkflowCommands(dependencies);

  assert.equal(harness.callbacks.size, 2);
  assert.ok(harness.callbacks.has(generateCommitMessageCommandId));
  assert.ok(harness.callbacks.has(reviewChangesCommandId));
  disposables.forEach((disposable) => disposable.dispose());
});

test("maps staged context to the Commit Message API and displays the suggestion", async () => {
  let receivedRequest: unknown;
  const { dependencies, harness, lines } = createDependencies({
    client: {
      generateCommitMessage: async (request) => {
        receivedRequest = request;
        return {
          subject: "feat: add output",
          body: "Add console output.",
          commit_type: "feat",
          breaking_change: false,
          reasoning: "Adds a feature.",
        };
      },
      reviewChanges: async () => ({
        summary: "No clear defects.",
        findings: [],
        testing_recommendations: [],
      }),
    },
  });
  registerGitWorkflowCommands(dependencies);

  await harness.callbacks.get(generateCommitMessageCommandId)?.();

  assert.deepEqual(receivedRequest, {
    diff_summary: "diff --git a/src/main.py b/src/main.py\n+print('ok')",
    changed_files: ["src/main.py"],
  });
  assert.deepEqual(lines, [
    "Commit Message Suggestion",
    "Subject: feat: add output",
    "Commit type: feat",
    "Body: Add console output.",
  ]);
});

test("shows a friendly message instead of calling the backend without staged changes", async () => {
  let information = "";
  let calls = 0;
  const { dependencies, harness } = createDependencies({
    collector: {
      collect: async () => ({
        kind: "empty",
        message: "No staged changes were found.",
      }),
    },
    client: {
      generateCommitMessage: async () => {
        calls += 1;
        throw new Error("not reached");
      },
      reviewChanges: async () => {
        calls += 1;
        throw new Error("not reached");
      },
    },
    showInformationMessage: (message) => {
      information = message;
    },
  });
  registerGitWorkflowCommands(dependencies);

  await harness.callbacks.get(generateCommitMessageCommandId)?.();

  assert.equal(calls, 0);
  assert.equal(information, "No staged changes were found.");
});

test("maps staged context to Change Review and displays empty findings", async () => {
  let receivedRequest: unknown;
  const { dependencies, harness, lines } = createDependencies({
    client: {
      generateCommitMessage: async () => ({
        subject: "feat: add output",
        body: "Add console output.",
        commit_type: "feat",
        breaking_change: false,
        reasoning: "Adds a feature.",
      }),
      reviewChanges: async (request) => {
        receivedRequest = request;
        return {
          summary: "No clear defects.",
          findings: [],
          testing_recommendations: ["Run the unit tests."],
        };
      },
    },
  });
  registerGitWorkflowCommands(dependencies);

  await harness.callbacks.get(reviewChangesCommandId)?.();

  assert.deepEqual(receivedRequest, {
    diff: "diff --git a/src/main.py b/src/main.py\n+print('ok')",
  });
  assert.deepEqual(lines, [
    "Change Review",
    "Summary: No clear defects.",
    "Findings:",
    "- No clear findings.",
    "Testing recommendations:",
    "- Run the unit tests.",
  ]);
});
