/** One-shot availability check for the local backend. */

import type { HealthResponse } from "./backend-client";

export type BackendHealthStatus = "healthy" | "unavailable";

export interface BackendHealthClient {
  getHealth(signal?: AbortSignal): Promise<HealthResponse>;
}

export class BackendHealthService {
  public constructor(private readonly client: BackendHealthClient) {}

  public async check(signal?: AbortSignal): Promise<BackendHealthStatus> {
    try {
      const response = await this.client.getHealth(signal);
      return response.status === "ok" ? "healthy" : "unavailable";
    } catch {
      return "unavailable";
    }
  }
}
