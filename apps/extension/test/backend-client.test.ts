import assert from "node:assert/strict";
import { test } from "node:test";

import {
  BackendClient,
  BackendClientError,
  type FetchImplementation,
} from "../src/backend-client";

function abortingFetch(): FetchImplementation {
  return (_input, init) =>
    new Promise((_resolve, reject) => {
      const rejectForAbort = () => {
        reject(new DOMException("Request aborted.", "AbortError"));
      };
      if (init?.signal?.aborted) {
        rejectForAbort();
        return;
      }
      init?.signal?.addEventListener("abort", rejectForAbort, { once: true });
    });
}

test("returns a typed health response", async () => {
  let requestedUrl = "";
  const fetchImplementation: FetchImplementation = async (input, init) => {
    requestedUrl = input;
    assert.equal(init?.method, "GET");
    return new Response(JSON.stringify({ status: "ok" }), { status: 200 });
  };
  const client = new BackendClient({
    baseUrl: "http://127.0.0.1:8000/",
    fetchImplementation,
  });

  const health = await client.getHealth();

  assert.equal(requestedUrl, "http://127.0.0.1:8000/health");
  assert.deepEqual(health, { status: "ok" });
});

test("posts a typed Explain Code request", async () => {
  let requestedUrl = "";
  let requestBody = "";
  const fetchImplementation: FetchImplementation = async (input, init) => {
    requestedUrl = input;
    assert.equal(init?.method, "POST");
    assert.deepEqual(init?.headers, { "Content-Type": "application/json" });
    requestBody = String(init?.body);
    return new Response(
      JSON.stringify({
        summary: "Prints a value.",
        explanation: "Calls print.",
        key_points: ["Uses a built-in."],
        risks: [],
      }),
      { status: 200 },
    );
  };
  const client = new BackendClient({
    baseUrl: "http://127.0.0.1:8000",
    fetchImplementation,
  });

  const result = await client.explainCode({
    code: "print('ok')",
    language: "python",
  });

  assert.equal(requestedUrl, "http://127.0.0.1:8000/api/v1/explanations");
  assert.deepEqual(JSON.parse(requestBody), {
    code: "print('ok')",
    language: "python",
  });
  assert.equal(result.summary, "Prints a value.");
});

test("posts a typed Development Plan request", async () => {
  let requestedUrl = "";
  let requestBody = "";
  const fetchImplementation: FetchImplementation = async (input, init) => {
    requestedUrl = input;
    assert.equal(init?.method, "POST");
    requestBody = String(init?.body);
    return new Response(
      JSON.stringify({
        requirement_understanding: "Add a profile endpoint.",
        assumptions: [],
        affected_files: [],
        implementation_steps: ["Add the route."],
        validation_steps: ["Add a test."],
        risks: [],
        out_of_scope: [],
      }),
      { status: 200 },
    );
  };
  const client = new BackendClient({
    baseUrl: "http://127.0.0.1:8000",
    fetchImplementation,
  });

  const result = await client.generateDevelopmentPlan({
    request_description: "Add a profile endpoint.",
  });

  assert.equal(requestedUrl, "http://127.0.0.1:8000/api/v1/development-plans");
  assert.deepEqual(JSON.parse(requestBody), {
    request_description: "Add a profile endpoint.",
  });
  assert.deepEqual(result.implementation_steps, ["Add the route."]);
});

test("maps timeout to a backend client error", async () => {
  const client = new BackendClient({
    baseUrl: "http://127.0.0.1:8000",
    timeoutMs: 1,
    fetchImplementation: abortingFetch(),
  });

  await assert.rejects(client.getHealth(), (error: unknown) => {
    assert.ok(error instanceof BackendClientError);
    assert.equal(error.kind, "timeout");
    return true;
  });
});

test("maps backend errors without exposing backend content", async () => {
  const client = new BackendClient({
    baseUrl: "http://127.0.0.1:8000",
    fetchImplementation: async () => new Response("internal detail", { status: 503 }),
  });

  await assert.rejects(client.getHealth(), (error: unknown) => {
    assert.ok(error instanceof BackendClientError);
    assert.equal(error.kind, "backend");
    assert.equal(error.statusCode, 503);
    assert.equal(error.message, "Backend request failed.");
    return true;
  });
});

test("maps caller cancellation to a backend client error", async () => {
  const controller = new AbortController();
  const client = new BackendClient({
    baseUrl: "http://127.0.0.1:8000",
    fetchImplementation: abortingFetch(),
  });
  controller.abort();

  await assert.rejects(client.getHealth(controller.signal), (error: unknown) => {
    assert.ok(error instanceof BackendClientError);
    assert.equal(error.kind, "cancelled");
    return true;
  });
});
