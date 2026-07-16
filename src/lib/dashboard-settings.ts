/**
 * Dashboard Settings Persistence
 * Saves and loads user dashboard preferences using localStorage
 * Includes: featured albums, time greetings, birthdays, countdowns, etc.
 */

const STORAGE_PREFIX = "usflix_dashboard_";

export interface DashboardSettings {
  // Featured Albums
  featuredAlbums?: string[]; // Array of collection/album IDs
  
  // Time & Date settings
  lastTimeGreeting?: {
    timeOfDay: string;
    message: string;
    creatorName?: string;
    timestamp: number;
  };
  
  // Birthday settings
  birthdayRemindersEnabled?: boolean;
  birthdayNotifications?: Record<string, string[]>; // profileId -> array of notification types already shown
  
  // Countdown settings
  anniversaryCountdownVisible?: boolean;
  
  // Component visibility preferences
  componentVisibility?: {
    timeGreeting?: boolean;
    timeTogether?: boolean;
    anniversaryCountdown?: boolean;
    birthdayCelebration?: boolean;
    playlist?: boolean;
    moodOfDay?: boolean;
    weather?: boolean;
    firstTimes?: boolean;
    loveLetters?: boolean;
    loveJar?: boolean;
    moodBoard?: boolean;
    canvas?: boolean;
    bucketList?: boolean;
    quiz?: boolean;
    randomMemory?: boolean;
    distance?: boolean;
  };
  
  // Last updated timestamp
  lastUpdated?: number;
}

/**
 * Get a specific setting key from localStorage
 */
function getStorageKey(key: keyof DashboardSettings): string {
  return `${STORAGE_PREFIX}${key}`;
}

/**
 * Load all dashboard settings from localStorage
 */
export function loadDashboardSettings(): DashboardSettings {
  if (typeof window === "undefined") return {};
  
  try {
    const settings: DashboardSettings = {};
    const keys: Array<keyof DashboardSettings> = [
      'featuredAlbums',
      'lastTimeGreeting',
      'birthdayRemindersEnabled',
      'birthdayNotifications',
      'anniversaryCountdownVisible',
      'componentVisibility',
      'lastUpdated',
    ];
    
    for (const key of keys) {
      const storageKey = getStorageKey(key);
      const value = localStorage.getItem(storageKey);
      if (value) {
        try {
          settings[key] = JSON.parse(value) as any;
        } catch {
          // If parsing fails, skip this setting
        }
      }
    }
    
    return settings;
  } catch (error) {
    console.error('Failed to load dashboard settings:', error);
    return {};
  }
}

/**
 * Save a specific dashboard setting to localStorage
 */
export function saveDashboardSetting<K extends keyof DashboardSettings>(
  key: K,
  value: DashboardSettings[K]
): void {
  if (typeof window === "undefined") return;
  
  try {
    const storageKey = getStorageKey(key);
    localStorage.setItem(storageKey, JSON.stringify(value));
    
    // Update lastUpdated timestamp
    const lastUpdatedKey = getStorageKey('lastUpdated');
    localStorage.setItem(lastUpdatedKey, JSON.stringify(Date.now()));
  } catch (error) {
    console.error(`Failed to save dashboard setting ${key}:`, error);
  }
}

/**
 * Save multiple dashboard settings at once
 */
export function saveDashboardSettings(settings: Partial<DashboardSettings>): void {
  if (typeof window === "undefined") return;
  
  try {
    for (const [key, value] of Object.entries(settings)) {
      if (key !== 'lastUpdated') {
        const storageKey = getStorageKey(key as keyof DashboardSettings);
        localStorage.setItem(storageKey, JSON.stringify(value));
      }
    }
    
    // Update lastUpdated timestamp
    const lastUpdatedKey = getStorageKey('lastUpdated');
    localStorage.setItem(lastUpdatedKey, JSON.stringify(Date.now()));
  } catch (error) {
    console.error('Failed to save dashboard settings:', error);
  }
}

/**
 * Clear all dashboard settings
 */
export function clearDashboardSettings(): void {
  if (typeof window === "undefined") return;
  
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(STORAGE_PREFIX));
    for (const key of keys) {
      localStorage.removeItem(key);
    }
  } catch (error) {
    console.error('Failed to clear dashboard settings:', error);
  }
}

/**
 * Get a single dashboard setting
 */
export function getDashboardSetting<K extends keyof DashboardSettings>(
  key: K
): DashboardSettings[K] | undefined {
  if (typeof window === "undefined") return undefined;
  
  try {
    const storageKey = getStorageKey(key);
    const value = localStorage.getItem(storageKey);
    if (value) {
      return JSON.parse(value) as DashboardSettings[K];
    }
  } catch (error) {
    console.error(`Failed to get dashboard setting ${key}:`, error);
  }
  
  return undefined;
}
