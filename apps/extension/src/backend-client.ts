/** Typed local HTTP client for the FastAPI backend. */

export interface HealthResponse {
  status: string;
}

export interface ExplainCodeRequest {
  code: string;
  language: string;
  metadata?: Record<string, string>;
}

export interface ExplainCodeResult {
  summary: string;
  explanation: string;
  key_points: string[];
  risks: string[];
}

export type BackendClientErrorKind =
  "backend" | "cancelled" | "invalid_response" | "network" | "timeout";

export class BackendClientError extends Error {
  public constructor(
    public readonly kind: BackendClientErrorKind,
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = "BackendClientError";
  }
}

export type FetchImplementation = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;

export interface BackendClientOptions {
  baseUrl: string;
  timeoutMs?: number;
  fetchImplementation?: FetchImplementation;
}

export interface BackendRequestOptions {
  method?: "GET" | "POST";
  body?: unknown;
  signal?: AbortSignal;
}

const defaultTimeoutMs = 5_000;

export class BackendClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchImplementation: FetchImplementation;

  public constructor(options: BackendClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.timeoutMs = options.timeoutMs ?? defaultTimeoutMs;
    this.fetchImplementation = options.fetchImplementation ?? fetch;

    if (!this.baseUrl) {
      throw new Error("baseUrl must not be empty.");
    }
    if (this.timeoutMs <= 0) {
      throw new Error("timeoutMs must be positive.");
    }
  }

  public async getHealth(signal?: AbortSignal): Promise<HealthResponse> {
    const response = await this.request<unknown>("/health", { signal });
    if (!isHealthResponse(response)) {
      throw new BackendClientError(
        "invalid_response",
        "Backend returned an invalid health response.",
      );
    }
    return response;
  }

  public async explainCode(
    request: ExplainCodeRequest,
    signal?: AbortSignal,
  ): Promise<ExplainCodeResult> {
    const response = await this.request<unknown>("/api/v1/explanations", {
      method: "POST",
      body: request,
      signal,
    });
    if (!isExplainCodeResult(response)) {
      throw new BackendClientError(
        "invalid_response",
        "Backend returned an invalid code explanation.",
      );
    }
    return response;
  }

  public async request<T>(
    path: string,
    options: BackendRequestOptions = {},
  ): Promise<T> {
    const controller = new AbortController();
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, this.timeoutMs);
    const abortFromCaller = () => controller.abort();
    const hasBody = options.body !== undefined;

    options.signal?.addEventListener("abort", abortFromCaller, { once: true });
    if (options.signal?.aborted) {
      controller.abort();
    }

    try {
      const response = await this.fetchImplementation(`${this.baseUrl}${path}`, {
        method: options.method ?? "GET",
        headers: hasBody ? { "Content-Type": "application/json" } : undefined,
        body: hasBody ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new BackendClientError(
          "backend",
          "Backend request failed.",
          response.status,
        );
      }
      try {
        return (await response.json()) as T;
      } catch {
        throw new BackendClientError(
          "invalid_response",
          "Backend returned invalid JSON.",
        );
      }
    } catch (error) {
      if (error instanceof BackendClientError) {
        throw error;
      }
      if (timedOut) {
        throw new BackendClientError("timeout", "Backend request timed out.");
      }
      if (options.signal?.aborted) {
        throw new BackendClientError("cancelled", "Backend request was cancelled.");
      }
      throw new BackendClientError(
        "network",
        "Backend request could not be completed.",
      );
    } finally {
      clearTimeout(timeout);
      options.signal?.removeEventListener("abort", abortFromCaller);
    }
  }
}

function isHealthResponse(value: unknown): value is HealthResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "status" in value &&
    typeof value.status === "string"
  );
}

function isExplainCodeResult(value: unknown): value is ExplainCodeResult {
  return (
    typeof value === "object" &&
    value !== null &&
    "summary" in value &&
    "explanation" in value &&
    "key_points" in value &&
    "risks" in value &&
    typeof value.summary === "string" &&
    typeof value.explanation === "string" &&
    Array.isArray(value.key_points) &&
    Array.isArray(value.risks) &&
    value.key_points.every((point) => typeof point === "string") &&
    value.risks.every((risk) => typeof risk === "string")
  );
}
