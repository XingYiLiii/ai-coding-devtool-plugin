import assert from "node:assert/strict";
import { test } from "node:test";

import {
  BackendHealthService,
  type BackendHealthClient,
} from "../src/backend-health-service";
import { getBackendStatusPresentation } from "../src/backend-status";

function clientReturning(status: string): BackendHealthClient {
  return {
    getHealth: async () => ({ status }),
  };
}

test("reports a healthy backend when the health endpoint returns ok", async () => {
  const service = new BackendHealthService(clientReturning("ok"));

  const status = await service.check();

  assert.equal(status, "healthy");
});

test("reports an unavailable backend when the health request fails", async () => {
  const client: BackendHealthClient = {
    getHealth: async () => {
      throw new Error("backend unavailable");
    },
  };
  const service = new BackendHealthService(client);

  const status = await service.check();

  assert.equal(status, "unavailable");
});

test("maps health status to safe status bar text", () => {
  assert.deepEqual(getBackendStatusPresentation("healthy"), {
    text: "DevPilot: Ready",
    tooltip: "Local backend is connected.",
  });
  assert.deepEqual(getBackendStatusPresentation("unavailable"), {
    text: "DevPilot: Offline",
    tooltip: "Local backend is unavailable.",
  });
});
