import assert from "node:assert/strict";
import { test } from "node:test";

import { BackendClientError } from "../src/backend-client";
import { getBackendStatusPresentation } from "../src/backend-status";
import { getBackendErrorMessage } from "../src/user-messages";

test("maps backend errors to safe actionable messages", () => {
  assert.equal(
    getBackendErrorMessage(
      new BackendClientError("network", "internal detail"),
      "review staged changes",
    ),
    "DevPilot: The local backend is unavailable. Start it and try again.",
  );
  assert.equal(
    getBackendErrorMessage(
      new BackendClientError("timeout", "internal detail"),
      "review staged changes",
    ),
    "DevPilot: The backend request timed out. Check the local backend and try again.",
  );
  assert.equal(
    getBackendErrorMessage(
      new BackendClientError("backend", "internal detail", 422),
      "review staged changes",
    ),
    "DevPilot: The request is invalid. Check your input and try again.",
  );
  assert.equal(
    getBackendErrorMessage(
      new BackendClientError("invalid_response", "internal detail"),
      "review staged changes",
    ),
    "DevPilot: The backend returned an unexpected response. Try again.",
  );
});

test("maps checking status without exposing connection details", () => {
  assert.deepEqual(getBackendStatusPresentation("checking"), {
    text: "DevPilot: Checking...",
    tooltip: "Checking the local backend connection.",
  });
});
