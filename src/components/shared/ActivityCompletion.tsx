/**
 * ActivityCompletion
 * Daily activity completion card with streak tracking.
 */
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/clerk-react";
import { Loader2, Flame, CheckCircle2, Heart, Calendar, Trophy } from "lucide-react";
import { useLinkStatus } from "@/context/link-status";
import { useWebSocketEvent } from "@/context/websocket";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

interface TodayActivity {
  date: string;
  userCompleted: boolean;
  partnerCompleted: boolean;
  userResponse: any;
  partnerResponse: any;
}

interface Streaks {
  currentStreak: number;
  longestStreak: number;
}

export function ActivityCompletion() {
  const toast = useToast();
  const { getToken, isSignedIn } = useAuth();
  const { isLinked, partner } = useLinkStatus();
  const [todayActivity, setTodayActivity] = useState<TodayActivity | null>(null);
  const [streaks, setStreaks] = useState<Streaks>({ currentStreak: 0, longestStreak: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);
  const [response, setResponse] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = useCallback(async () => {
    if (!isSignedIn || !isLinked) return;

    setIsLoading(true);
    setError(null);

    try {
      const token = await getToken();
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/shared/activities?type=daily`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        throw new Error("Failed to fetch activities");
      }

      const data = await res.json();

      if (data.ok) {
        setTodayActivity(data.todayActivity);
        setStreaks({
          currentStreak: data.currentStreak || 0,
          longestStreak: data.longestStreak || 0,
        });
      }
    } catch (err) {
      console.error("Error fetching activities:", err);
      setError(err instanceof Error ? err.message : "Failed to load activities");
    } finally {
      setIsLoading(false);
    }
  }, [isSignedIn, isLinked, getToken]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const handleComplete = async () => {
    if (!response.trim()) {
      toast.error("Please enter your response");
      return;
    }

    setIsCompleting(true);

    try {
      const data = await api.post<{
        ok: boolean;
        partnerCompleted?: boolean;
        bothNowComplete?: boolean;
        error?: string;
      }>("/shared/activities/complete", {
        activityType: "daily",
        response: { text: response.trim() },
      });

      if (data.ok) {
        toast.success(
          data.bothNowComplete
            ? "Both completed! 🎉 Streak continues!"
            : "Activity completed! Waiting for partner..."
        );
        setResponse("");
        await fetchActivities();
      } else {
        toast.error(data.error || "Failed to complete activity");
      }
    } catch (err) {
      console.error("Error completing activity:", err);
      toast.error(err instanceof Error ? err.message : "Failed to complete activity");
    } finally {
      setIsCompleting(false);
    }
  };

  // Listen for partner completion via WebSocket
  useWebSocketEvent("activity:completed", useCallback((data: any) => {
    if (data.bothCompleted) {
      toast.success(`${data.userName} completed the activity! 🎉`);
      fetchActivities();
    }
  }, [fetchActivities, toast]));

  if (!isLinked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] bg-muted/30 rounded-xl p-8">
        <Heart className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No Partner Linked</h3>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          Link with your partner to complete daily activities together.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] bg-destructive/10 rounded-xl p-8">
        <p className="text-destructive text-center">{error}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const bothCompleted = todayActivity?.userCompleted && todayActivity?.partnerCompleted;
  const userCompleted = todayActivity?.userCompleted || false;
  const partnerCompleted = todayActivity?.partnerCompleted || false;

  return (
    <div className="space-y-6">
      {/* Streak Cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* Current Streak */}
        <div className="p-6 bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/30 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Flame className="h-5 w-5 text-orange-500" />
            <span className="text-sm font-medium text-orange-500">Current Streak</span>
          </div>
          <p className="text-4xl font-bold text-foreground">{streaks.currentStreak}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {streaks.currentStreak === 1 ? "day" : "days"} in a row
          </p>
        </div>

        {/* Longest Streak */}
        <div className="p-6 bg-gradient-to-br from-amber-500/10 to-yellow-500/10 border border-amber-500/30 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            <span className="text-sm font-medium text-amber-500">Best Streak</span>
          </div>
          <p className="text-4xl font-bold text-foreground">{streaks.longestStreak}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {streaks.longestStreak === 1 ? "day" : "days"} record
          </p>
        </div>
      </div>

      {/* Today's Activity Card */}
      <div className="p-6 bg-card border border-border rounded-xl">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-medium text-foreground">Today's Activity</h3>
        </div>

        {bothCompleted ? (
          /* Both Completed State */
          <div className="space-y-4">
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
              <div>
                <p className="font-medium text-green-500">Activity Complete! 🎉</p>
                <p className="text-sm text-muted-foreground">
                  Both you and {partner?.name} completed today's activity
                </p>
              </div>
            </div>

            {/* Show Responses */}
            <div className="space-y-3">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs font-medium text-muted-foreground mb-1">Your response:</p>
                <p className="text-sm text-foreground">{todayActivity.userResponse?.text}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  {partner?.name}'s response:
                </p>
                <p className="text-sm text-foreground">{todayActivity.partnerResponse?.text}</p>
              </div>
            </div>
          </div>
        ) : userCompleted ? (
          /* User Completed, Waiting for Partner */
          <div className="space-y-4">
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center gap-3">
              <Loader2 className="h-6 w-6 text-amber-500 animate-spin" />
              <div>
                <p className="font-medium text-amber-500">Waiting for {partner?.name}...</p>
                <p className="text-sm text-muted-foreground">
                  You've completed today's activity
                </p>
              </div>
            </div>

            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs font-medium text-muted-foreground mb-1">Your response:</p>
              <p className="text-sm text-foreground">{todayActivity?.userResponse?.text}</p>
            </div>
          </div>
        ) : (
          /* Not Yet Completed */
          <div className="space-y-4">
            <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg">
              <p className="text-sm font-medium text-primary mb-2">
                💭 Share something that made you smile today
              </p>
              <p className="text-xs text-muted-foreground">
                Complete this together with your partner to maintain your streak!
              </p>
            </div>

            {partnerCompleted && (
              <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <p className="text-sm text-green-500">
                  {partner?.name} has completed this activity
                </p>
              </div>
            )}

            {/* Response Input */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Your Response
              </label>
              <textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                placeholder="Type your response..."
                rows={4}
                disabled={isCompleting}
                className="w-full px-4 py-3 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 resize-none"
              />
            </div>

            {/* Complete Button */}
            <button
              type="button"
              onClick={handleComplete}
              disabled={!response.trim() || isCompleting}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {isCompleting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Completing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5" />
                  Complete Activity
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
