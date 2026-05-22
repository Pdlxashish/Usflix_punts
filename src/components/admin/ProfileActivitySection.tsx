/**
 * Account — active viewer profiles and activity audit log.
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { Users, Activity, RefreshCw, Monitor, Globe, Clock, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { api } from "@/lib/api";
import { AdminSectionCard } from "@/components/admin/AdminSubNavLayout";

const PAGE_SIZE = 20;
type ActiveSession = {
  profileId: string;
  profileName: string;
  profileColor: string;
  clientId: string;
  startedAt: string;
  lastSeenAt: string;
  ip: string | null;
  userAgent: string | null;
};

type ActivityEntry = {
  id: number;
  profileId: string | null;
  profileName: string | null;
  adminUsername: string | null;
  clientId: string | null;
  action: string;
  details: Record<string, unknown>;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
};

const ACTION_LABELS: Record<string, string> = {
  profile_selected: "Profile selected",
  profile_heartbeat: "Active session",
  my_list_added: "Added to My List",
  my_list_removed: "Removed from My List",
  comment_added: "Posted comment",
  comment_deleted: "Deleted comment",
  media_viewed: "Watched media",
  admin_login: "Admin signed in",
  admin_logout: "Admin signed out",
  admin_password_changed: "Admin password changed",
  location_shared: "Shared location",
};

function formatDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return formatDateTime(iso);
}

function describeDetails(action: string, details: Record<string, unknown>): string {
  const parts: string[] = [];
  if (details.mediaId) parts.push(`Media: ${details.mediaId}`);
  if (details.mediaTitle) parts.push(`"${details.mediaTitle}"`);
  if (details.text && typeof details.text === "string") {
    const t = details.text.length > 80 ? `${details.text.slice(0, 80)}…` : details.text;
    parts.push(`"${t}"`);
  }
  if (details.username) parts.push(`User: ${details.username}`);
  if (details.videoTime != null) parts.push(`At ${Number(details.videoTime).toFixed(1)}s`);
  if (parts.length === 0 && action === "profile_selected") return "Opened the site with this profile";
  return parts.join(" · ") || "—";
}

function shortUserAgent(ua: string | null): string {
  if (!ua) return "Unknown device";
  if (ua.includes("Mobile")) return "Mobile browser";
  if (ua.includes("Chrome")) return "Chrome";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Safari")) return "Safari";
  if (ua.includes("Edge")) return "Edge";
  return ua.slice(0, 48) + (ua.length > 48 ? "…" : "");
}

export function ProfileActivitySection() {
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Activity log controls
  const [filterAction, setFilterAction] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<{
        ok: boolean;
        activeSessions: ActiveSession[];
        recentActivity: ActivityEntry[];
      }>("/activity");
      setSessions(data.activeSessions ?? []);
      setActivity(data.recentActivity ?? []);
    } catch {
      setError("Could not load activity. Make sure the backend is running and you are signed in.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = window.setInterval(load, 30000);
    return () => window.clearInterval(interval);
  }, [load]);

  // Reset page when filter changes
  useEffect(() => { setPage(0); }, [filterAction]);

  const filteredActivity = useMemo(() => {
    if (filterAction === "all") return activity;
    return activity.filter((e) => e.action === filterAction);
  }, [activity, filterAction]);

  const totalPages = Math.max(1, Math.ceil(filteredActivity.length / PAGE_SIZE));
  const pageEntries = filteredActivity.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Unique action types for the filter dropdown
  const actionTypes = useMemo(() => {
    const seen = new Set<string>();
    for (const e of activity) seen.add(e.action);
    return Array.from(seen).sort();
  }, [activity]);

  return (
    <div className="space-y-6">
      {/* ── Active sessions ── */}
      <AdminSectionCard
        title="Active profiles"
        description="Viewer profiles in use on a device within the last 30 minutes."
      >
        <div className="flex items-center justify-between gap-3 mb-4">
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Users className="h-4 w-4" />
            {sessions.length} active {sessions.length === 1 ? "session" : "sessions"}
          </p>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {loading && sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No active profiles right now. Someone must pick a profile on the &quot;Who&apos;s watching?&quot; screen.
          </p>
        ) : (
          <ul className="space-y-3">
            {sessions.map((s) => (
              <li
                key={`${s.profileId}-${s.clientId}`}
                className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-lg border border-border/60 bg-background/40"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className={`w-10 h-10 rounded-md shrink-0 flex items-center justify-center text-lg font-display text-white ${s.profileColor}`}
                  >
                    {s.profileName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{s.profileName}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      Device: {s.clientId.slice(0, 20)}…
                    </p>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground space-y-1 sm:text-right shrink-0">
                  <p className="flex items-center gap-1 sm:justify-end">
                    <Clock className="h-3 w-3" />
                    Last seen {formatRelative(s.lastSeenAt)}
                  </p>
                  <p className="flex items-center gap-1 sm:justify-end">
                    <Monitor className="h-3 w-3" />
                    {shortUserAgent(s.userAgent)}
                  </p>
                  {s.ip && (
                    <p className="flex items-center gap-1 sm:justify-end">
                      <Globe className="h-3 w-3" />
                      {s.ip}
                    </p>
                  )}
                  <p>Since {formatDateTime(s.startedAt)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </AdminSectionCard>

      {/* ── Activity log ── */}
      <AdminSectionCard
        title="Activity log"
        description="Recent actions by viewer profiles and admin users, newest first."
      >
        {error && <p className="text-sm text-destructive mb-4">{error}</p>}

        {/* Toolbar */}
        {activity.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
            <div className="flex items-center gap-2 flex-1">
              <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="bg-input border border-border rounded-md px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="all">All actions</option>
                {actionTypes.map((a) => (
                  <option key={a} value={a}>{ACTION_LABELS[a] ?? a}</option>
                ))}
              </select>
            </div>
            <p className="text-xs text-muted-foreground shrink-0">
              {filteredActivity.length} {filteredActivity.length === 1 ? "entry" : "entries"}
              {filterAction !== "all" && " (filtered)"}
            </p>
          </div>
        )}

        {loading && activity.length === 0 ? (
          <p className="text-sm text-muted-foreground">Loading activity…</p>
        ) : activity.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No activity recorded yet. Actions appear when profiles watch media, comment, or use My List.
          </p>
        ) : filteredActivity.length === 0 ? (
          <p className="text-sm text-muted-foreground">No entries match the selected filter.</p>
        ) : (
          <>
            {/* Table */}
            <div className="overflow-x-auto -mx-2 sm:mx-0 rounded-lg border border-border/40">
              <table className="w-full text-sm min-w-[520px]">
                <thead>
                  <tr className="border-b border-border/60 bg-card/60 text-left text-muted-foreground text-xs uppercase tracking-wide">
                    <th className="py-2 px-3 font-medium w-[100px]">Time</th>
                    <th className="py-2 px-3 font-medium w-[120px]">Who</th>
                    <th className="py-2 px-3 font-medium">Action</th>
                    <th className="py-2 px-3 font-medium">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {pageEntries.map((entry) => {
                    const who = entry.adminUsername
                      ? `Admin (${entry.adminUsername})`
                      : entry.profileName ?? entry.profileId ?? "Unknown";
                    const isExpanded = expandedRow === entry.id;
                    const deviceInfo = [shortUserAgent(entry.userAgent), entry.ip].filter(Boolean).join(" · ");
                    return (
                      <>
                        <tr
                          key={entry.id}
                          onClick={() => setExpandedRow(isExpanded ? null : entry.id)}
                          className="border-b border-border/20 hover:bg-card/40 cursor-pointer transition-colors"
                        >
                          <td className="py-2.5 px-3 whitespace-nowrap text-xs text-muted-foreground">
                            <span title={formatDateTime(entry.createdAt)}>{formatRelative(entry.createdAt)}</span>
                          </td>
                          <td className="py-2.5 px-3 text-xs font-medium truncate max-w-[120px]">{who}</td>
                          <td className="py-2.5 px-3">
                            <span className="inline-flex items-center gap-1 text-xs">
                              <Activity className="h-3 w-3 text-primary shrink-0" />
                              {ACTION_LABELS[entry.action] ?? entry.action}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-xs text-muted-foreground max-w-[200px] truncate">
                            {describeDetails(entry.action, entry.details)}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${entry.id}-expanded`} className="bg-card/60 border-b border-border/20">
                            <td colSpan={4} className="px-3 py-2.5">
                              <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDateTime(entry.createdAt)}
                                </span>
                                {deviceInfo && (
                                  <span className="flex items-center gap-1">
                                    <Monitor className="h-3 w-3" />
                                    {deviceInfo}
                                  </span>
                                )}
                                <span className="text-foreground/60">
                                  {describeDetails(entry.action, entry.details)}
                                </span>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-md border border-border hover:bg-card disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Prev
                </button>
                <span className="text-xs text-muted-foreground">
                  Page {page + 1} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-md border border-border hover:bg-card disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </>
        )}
      </AdminSectionCard>
    </div>
  );
}
