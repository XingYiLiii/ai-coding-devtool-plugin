import assert from "node:assert/strict";
import { test } from "node:test";

import {
  generatePlanCommandId,
  registerGeneratePlanCommand,
  type DevelopmentPlanCommandRegistry,
  type GeneratePlanCommandDependencies,
} from "../src/generate-plan-command";

interface CommandHarness {
  callback?: () => Promise<void>;
  command?: string;
}

function createDependencies(overrides: Partial<GeneratePlanCommandDependencies> = {}): {
  dependencies: GeneratePlanCommandDependencies;
  harness: CommandHarness;
  lines: string[];
} {
  const harness: CommandHarness = {};
  const lines: string[] = [];
  const commands: DevelopmentPlanCommandRegistry = {
    registerCommand: (command, callback) => {
      harness.command = command;
      harness.callback = callback;
      return { dispose: () => undefined };
    },
  };
  const dependencies: GeneratePlanCommandDependencies = {
    commands,
    getRequestDescription: async () => "Add a profile endpoint.",
    client: {
      generateDevelopmentPlan: async () => ({
        requirement_understanding: "Add a profile endpoint.",
        assumptions: ["Authentication exists."],
        affected_files: ["src/api/profile.py"],
        implementation_steps: ["Add the route."],
        validation_steps: ["Add an API test."],
        risks: ["Authentication contract may change."],
        out_of_scope: ["Frontend changes."],
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

test("registers the Development Plan command", () => {
  const { dependencies, harness } = createDependencies();

  const disposable = registerGeneratePlanCommand(dependencies);

  assert.equal(harness.command, generatePlanCommandId);
  assert.ok(harness.callback);
  disposable.dispose();
});

test("does not call the backend when the user cancels input", async () => {
  let calls = 0;
  let information = "";
  const { dependencies, harness } = createDependencies({
    getRequestDescription: async () => undefined,
    client: {
      generateDevelopmentPlan: async () => {
        calls += 1;
        throw new Error("not reached");
      },
    },
    showInformationMessage: (message) => {
      information = message;
    },
  });
  registerGeneratePlanCommand(dependencies);

  await harness.callback?.();

  assert.equal(calls, 0);
  assert.equal(information, "DevPilot: Development plan generation cancelled.");
});

test("maps the user request and displays a successful development plan", async () => {
  let receivedRequest: unknown;
  let information = "";
  const { dependencies, harness, lines } = createDependencies({
    client: {
      generateDevelopmentPlan: async (request) => {
        receivedRequest = request;
        return {
          requirement_understanding: "Add a profile endpoint.",
          assumptions: ["Authentication exists."],
          affected_files: ["src/api/profile.py"],
          implementation_steps: ["Add the route."],
          validation_steps: ["Add an API test."],
          risks: ["Authentication contract may change."],
          out_of_scope: ["Frontend changes."],
        };
      },
    },
    showInformationMessage: (message) => {
      information = message;
    },
  });
  registerGeneratePlanCommand(dependencies);

  await harness.callback?.();

  assert.deepEqual(receivedRequest, {
    request_description: "Add a profile endpoint.",
  });
  assert.deepEqual(lines, [
    "# DevPilot: Development Plan",
    "---",
    "## Requirement understanding",
    "- Add a profile endpoint.",
    "## Assumptions",
    "- Authentication exists.",
    "## Affected files",
    "- src/api/profile.py",
    "## Implementation steps",
    "- Add the route.",
    "## Validation steps",
    "- Add an API test.",
    "## Risks",
    "- Authentication contract may change.",
    "## Out of scope",
    "- Frontend changes.",
    "",
  ]);
  assert.equal(information, "DevPilot: Development plan generated.");
});
