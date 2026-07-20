/** Typed local HTTP client for the FastAPI backend. */

export interface HealthResponse {
  status: string;
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
  method?: "GET";
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

    options.signal?.addEventListener("abort", abortFromCaller, { once: true });
    if (options.signal?.aborted) {
      controller.abort();
    }

    try {
      const response = await this.fetchImplementation(`${this.baseUrl}${path}`, {
        method: options.method ?? "GET",
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
