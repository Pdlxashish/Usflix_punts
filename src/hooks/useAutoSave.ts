/**
 * Auto-save hook for form data
 */
import { useEffect, useRef, useState } from "react";

interface AutoSaveOptions<T> {
  data: T;
  onSave: (data: T) => Promise<void> | void;
  delay?: number; // milliseconds
  enabled?: boolean;
}

export function useAutoSave<T>({ data, onSave, delay = 2000, enabled = true }: AutoSaveOptions<T>) {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousDataRef = useRef<T>(data);

  useEffect(() => {
    if (!enabled) return;

    // Check if data actually changed
    const dataChanged = JSON.stringify(data) !== JSON.stringify(previousDataRef.current);
    if (!dataChanged) return;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(async () => {
      setIsSaving(true);
      setError(null);

      try {
        await onSave(data);
        setLastSaved(new Date());
        previousDataRef.current = data;
      } catch (err: any) {
        setError(err.message || "Failed to auto-save");
      } finally {
        setIsSaving(false);
      }
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, onSave, delay, enabled]);

  const saveNow = async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave(data);
      setLastSaved(new Date());
      previousDataRef.current = data;
    } catch (err: any) {
      setError(err.message || "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  return {
    isSaving,
    lastSaved,
    error,
    saveNow,
  };
}
