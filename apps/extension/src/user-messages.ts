/** Safe, actionable user-facing messages for backend failures. */

import { BackendClientError } from "./backend-client";

export function getBackendErrorMessage(error: unknown, action: string): string {
  if (!(error instanceof BackendClientError)) {
    return `DevPilot: Unable to ${action}. Try again.`;
  }

  if (error.kind === "backend" && error.statusCode === 422) {
    return "DevPilot: The request is invalid. Check your input and try again.";
  }

  switch (error.kind) {
    case "timeout":
      return "DevPilot: The backend request timed out. Check the local backend and try again.";
    case "backend":
    case "network":
      return "DevPilot: The local backend is unavailable. Start it and try again.";
    case "invalid_response":
      return "DevPilot: The backend returned an unexpected response. Try again.";
    case "cancelled":
      return "DevPilot: The request was cancelled.";
  }
}
