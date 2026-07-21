/** UI-safe mappings for backend availability. */

import type { BackendHealthStatus } from "./backend-health-service";

export type BackendStatus = BackendHealthStatus | "checking";

export interface BackendStatusPresentation {
  text: string;
  tooltip: string;
}

export function getBackendStatusPresentation(
  status: BackendStatus,
): BackendStatusPresentation {
  if (status === "checking") {
    return {
      text: "DevPilot: Checking...",
      tooltip: "Checking the local backend connection.",
    };
  }
  if (status === "healthy") {
    return {
      text: "DevPilot: Ready",
      tooltip: "Local backend is connected.",
    };
  }

  return {
    text: "DevPilot: Offline",
    tooltip: "Local backend is unavailable.",
  };
}
