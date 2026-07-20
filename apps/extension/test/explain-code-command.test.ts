import assert from "node:assert/strict";
import { test } from "node:test";

import {
  explainCodeCommandId,
  registerExplainCodeCommand,
  type CommandRegistry,
  type ExplainCodeCommandDependencies,
} from "../src/explain-code-command";

interface CommandHarness {
  callback?: () => Promise<void>;
  command?: string;
}

function createDependencies(overrides: Partial<ExplainCodeCommandDependencies> = {}): {
  dependencies: ExplainCodeCommandDependencies;
  harness: CommandHarness;
  lines: string[];
} {
  const harness: CommandHarness = {};
  const lines: string[] = [];
  const commands: CommandRegistry = {
    registerCommand: (command, callback) => {
      harness.command = command;
      harness.callback = callback;
      return { dispose: () => undefined };
    },
  };
  const dependencies: ExplainCodeCommandDependencies = {
    commands,
    getSelection: () => ({ code: "print('ok')", language: "python" }),
    client: {
      explainCode: async () => ({
        summary: "Prints a value.",
        explanation: "Calls print.",
        key_points: ["Uses a built-in."],
        risks: [],
      }),
    },
    outputChannel: {
      appendLine: (line) => lines.push(line),
      show: () => undefined,
    },
    showWarningMessage: () => undefined,
    showInformationMessage: () => undefined,
    showErrorMessage: () => undefined,
    ...overrides,
  };
  return { dependencies, harness, lines };
}

test("registers the Explain Code command", () => {
  const { dependencies, harness } = createDependencies();

  const disposable = registerExplainCodeCommand(dependencies);

  assert.equal(harness.command, explainCodeCommandId);
  assert.ok(harness.callback);
  disposable.dispose();
});

test("warns when no code selection is available", async () => {
  let warning = "";
  let calls = 0;
  const { dependencies, harness } = createDependencies({
    getSelection: () => undefined,
    client: {
      explainCode: async () => {
        calls += 1;
        throw new Error("not reached");
      },
    },
    showWarningMessage: (message) => {
      warning = message;
    },
  });
  registerExplainCodeCommand(dependencies);

  await harness.callback?.();

  assert.equal(warning, "Select code to explain first.");
  assert.equal(calls, 0);
});

test("maps a successful API response to the Output Channel", async () => {
  let receivedRequest: unknown;
  let information = "";
  const { dependencies, harness, lines } = createDependencies({
    getSelection: () => ({
      code: "print('ok')",
      language: "python",
      filePath: "C:/workspace/main.py",
    }),
    client: {
      explainCode: async (request) => {
        receivedRequest = request;
        return {
          summary: "Prints a value.",
          explanation: "Calls print.",
          key_points: ["Uses a built-in."],
          risks: [],
        };
      },
    },
    showInformationMessage: (message) => {
      information = message;
    },
  });
  registerExplainCodeCommand(dependencies);

  await harness.callback?.();

  assert.deepEqual(receivedRequest, {
    code: "print('ok')",
    language: "python",
    metadata: { path: "C:/workspace/main.py" },
  });
  assert.deepEqual(lines, [
    "Explain Code",
    "Summary: Prints a value.",
    "Explanation: Calls print.",
    "Key points:",
    "- Uses a built-in.",
    "Risks:",
  ]);
  assert.equal(information, "Code explanation generated.");
});
