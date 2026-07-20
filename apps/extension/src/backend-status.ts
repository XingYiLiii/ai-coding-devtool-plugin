/** UI-safe mappings for backend availability. */

import type { BackendHealthStatus } from "./backend-health-service";

export interface BackendStatusPresentation {
  text: string;
  tooltip: string;
}

export function getBackendStatusPresentation(
  status: BackendHealthStatus,
): BackendStatusPresentation {
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
