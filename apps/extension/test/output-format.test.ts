import assert from "node:assert/strict";
import { test } from "node:test";

import { writeMarkdownResult } from "../src/output-format";

test("writes consistent Markdown-friendly output with empty-state text", () => {
  const lines: string[] = [];
  let wasShown = false;

  writeMarkdownResult(
    {
      appendLine: (line) => lines.push(line),
      show: () => {
        wasShown = true;
      },
    },
    "Change Review",
    [
      { heading: "Summary", items: ["No clear defects."] },
      { heading: "Findings", items: [], emptyText: "No clear findings." },
    ],
  );

  assert.deepEqual(lines, [
    "# DevPilot: Change Review",
    "---",
    "## Summary",
    "- No clear defects.",
    "## Findings",
    "- No clear findings.",
    "",
  ]);
  assert.equal(wasShown, true);
});
