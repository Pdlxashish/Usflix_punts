/**
 * Time Greeting — Shows personalized greeting based on the viewer's local time of day.
 * Uses browser time (not server time) so each partner sees the correct greeting for their timezone.
 * Morning (5am-12pm), Afternoon (12pm-5pm), Evening (5pm-9pm), Night (9pm-5am)
 * 
 * IMPORTANT: Only shows greetings created by your PARTNER (not yourself)
 * - The message should contain the viewer's name (e.g., "Good Morning Punts")
 * - The attribution shows who wrote it (e.g., "— Ashish Poudel")
 */
import { useEffect, useState } from "react";
import { Sun, Cloud, Sunset, Moon } from "lucide-react";
import { fetchApiJson } from "@/lib/fetchApi";
import { getDashboardSetting, saveDashboardSetting } from "@/lib/dashboard-settings";

interface GreetingTemplate {
  timeOfDay: string;
  message: string;
  isDefault: boolean;
  creatorName?: string | null;
}

const TIME_ICONS = {
  morning: Sun,
  afternoon: Cloud,
  evening: Sunset,
  night: Moon,
};

const TIME_GRADIENTS = {
  morning: "from-amber-500/20 to-orange-500/20",
  afternoon: "from-sky-400/20 to-blue-500/20",
  evening: "from-orange-500/20 to-pink-500/20",
  night: "from-indigo-500/20 to-purple-600/20",
};

/** Determine time-of-day bucket from the browser's local hour */
function getLocalTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

export function TimeGreeting() {
  const [greetingTemplate, setGreetingTemplate] = useState<GreetingTemplate | null>(null);
  const [timeOfDay, setTimeOfDay] = useState<string>(getLocalTimeOfDay());
  const [loading, setLoading] = useState(true);

  const loadGreeting = async () => {
    const localTimeOfDay = getLocalTimeOfDay();
    setTimeOfDay(localTimeOfDay);
    
    // Try to load cached greeting first
    const cachedGreeting = getDashboardSetting('lastTimeGreeting');
    const cacheAge = cachedGreeting?.timestamp ? Date.now() - cachedGreeting.timestamp : Infinity;
    const cacheValid = cacheAge < 30 * 60 * 1000; // Cache valid for 30 minutes
    
    if (cachedGreeting && cacheValid && cachedGreeting.timeOfDay === localTimeOfDay) {
      setGreetingTemplate({
        timeOfDay: cachedGreeting.timeOfDay,
        message: cachedGreeting.message,
        creatorName: cachedGreeting.creatorName,
        isDefault: false,
      });
      setLoading(false);
      return;
    }
    
    try {
      // Fetch greeting templates from backend, but use local time to pick the right one
      const data = await fetchApiJson<GreetingTemplate>(`/greetings/current?timeOfDay=${localTimeOfDay}`);
      setGreetingTemplate(data);
      
      // Save to cache (convert null to undefined for consistency)
      saveDashboardSetting('lastTimeGreeting', {
        timeOfDay: localTimeOfDay,
        message: data.message,
        creatorName: data.creatorName ?? undefined,
        timestamp: Date.now(),
      });
    } catch {
      // Fallback defaults keyed by local time
      const defaults: Record<string, string> = {
        morning: "Good morning, sunshine! ☀️",
        afternoon: "Hope you're having a wonderful afternoon! 💕",
        evening: "Good evening, beautiful! 🌅",
        night: "Sweet dreams, my love! 🌙",
      };
      const fallbackGreeting = {
        timeOfDay: localTimeOfDay,
        message: defaults[localTimeOfDay] || "Hello! 💕",
        isDefault: true,
      };
      setGreetingTemplate(fallbackGreeting);
      
      // Save fallback to cache
      saveDashboardSetting('lastTimeGreeting', {
        timeOfDay: localTimeOfDay,
        message: fallbackGreeting.message,
        timestamp: Date.now(),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGreeting();
    // Refresh every 30 minutes to catch time-of-day transitions
    const interval = setInterval(loadGreeting, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !greetingTemplate) return null;

  const Icon = TIME_ICONS[timeOfDay as keyof typeof TIME_ICONS] || Sun;
  const gradient = TIME_GRADIENTS[timeOfDay as keyof typeof TIME_GRADIENTS] || TIME_GRADIENTS.morning;

  // The greeting creator's name (who wrote the message for you)
  const creatorName = greetingTemplate.creatorName;
  
  // Display the message as-is (it should already contain the viewer's name if personalized)
  const message = greetingTemplate.message;

  return (
    <section className="relative py-16 px-6 lg:px-12 overflow-hidden">
      {/* Background gradient */}
      <div
        className={`absolute inset-0 -z-10 bg-gradient-to-br ${gradient} opacity-50`}
      />

      <div className="max-w-4xl mx-auto text-center">
        {/* Icon with animation */}
        <div className="inline-flex items-center justify-center mb-6">
          <div className="relative">
            <div className={`absolute inset-0 bg-gradient-to-br ${gradient} rounded-full blur-xl opacity-60 animate-pulse`} />
            <div className="relative bg-card/80 backdrop-blur-sm border border-primary/30 rounded-full p-6">
              <Icon className="h-12 w-12 text-primary" />
            </div>
          </div>
        </div>

        {/* Greeting message */}
        <h2 className="font-display text-4xl md:text-5xl lg:text-6xl mb-4 animate-[fade-in_0.6s_ease-out]">
          {message}
        </h2>

        {/* Profile name tag - shows who wrote the greeting for you */}
        {creatorName && (
          <p className="text-sm text-primary/80 font-medium mb-3 tracking-wide">
            — {creatorName}
          </p>
        )}

        {/* Time indicator */}
        <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Keyframe animation */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  );
}
