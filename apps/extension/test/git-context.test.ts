import assert from "node:assert/strict";
import { test } from "node:test";

import {
  GitContextCollector,
  type GitContextSource,
  type StagedGitRepository,
} from "../src/git-context";

function sourceWith(
  changes: string[],
  diffs: Record<string, string>,
): GitContextSource {
  const repository: StagedGitRepository = {
    rootPath: "C:/workspace",
    getStagedChanges: async () => changes.map((path) => ({ path })),
    getStagedDiff: async (path) => diffs[path] ?? "",
  };
  return {
    getRepository: async () => repository,
  };
}

test("collects staged text diffs and changed files", async () => {
  const collector = new GitContextCollector(
    sourceWith(["src/main.py", "tests/test_main.py"], {
      "src/main.py": "diff --git a/src/main.py b/src/main.py\n+print('ok')",
      "tests/test_main.py":
        "diff --git a/tests/test_main.py b/tests/test_main.py\n+assert True",
    }),
  );

  const result = await collector.collect();

  assert.deepEqual(result, {
    kind: "ready",
    context: {
      repositoryRoot: "C:/workspace",
      diff: "diff --git a/src/main.py b/src/main.py\n+print('ok')\ndiff --git a/tests/test_main.py b/tests/test_main.py\n+assert True",
      changedFiles: ["src/main.py", "tests/test_main.py"],
    },
  });
});

test("returns a friendly empty result when no changes are staged", async () => {
  const collector = new GitContextCollector(sourceWith([], {}));

  const result = await collector.collect();

  assert.deepEqual(result, {
    kind: "empty",
    message: "No staged changes were found.",
  });
});

test("filters sensitive paths and binary diffs before building context", async () => {
  const collector = new GitContextCollector(
    sourceWith(["src/main.py", ".env.local", "secrets/key.txt", "assets/logo.png"], {
      "src/main.py": "diff --git a/src/main.py b/src/main.py\n+print('ok')",
      ".env.local": "diff --git a/.env.local b/.env.local\n+TOKEN=secret",
      "secrets/key.txt": "diff --git a/secrets/key.txt b/secrets/key.txt\n+secret",
      "assets/logo.png": "Binary files a/assets/logo.png and b/assets/logo.png differ",
    }),
  );

  const result = await collector.collect();

  assert.deepEqual(result, {
    kind: "ready",
    context: {
      repositoryRoot: "C:/workspace",
      diff: "diff --git a/src/main.py b/src/main.py\n+print('ok')",
      changedFiles: ["src/main.py"],
    },
  });
});
