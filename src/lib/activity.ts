/**
 * Client-side activity tracking for viewer profiles.
 */
import { api } from "@/lib/api";

const CLIENT_ID_KEY = "usflix_client_id";

export function getClientId(): string {
  if (typeof window === "undefined") return "server";
  let id = localStorage.getItem(CLIENT_ID_KEY);
  if (!id) {
    id = `c_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    localStorage.setItem(CLIENT_ID_KEY, id);
  }
  return id;
}

export type ViewerActivityAction =
  | "profile_selected"
  | "profile_heartbeat"
  | "media_viewed";

export function logViewerActivity(
  action: ViewerActivityAction,
  profileId: string | null | undefined,
  details?: Record<string, unknown>
): void {
  if (!profileId && action !== "profile_heartbeat") return;

  api
    .post("/activity/log", {
      profileId: profileId ?? undefined,
      action,
      clientId: getClientId(),
      details: details ?? {},
    })
    .catch(() => {});
}
