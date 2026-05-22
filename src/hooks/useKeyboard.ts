/**
 * Keyboard navigation and shortcuts hook
 */
import { useEffect } from "react";

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  callback: (e: KeyboardEvent) => void;
  description?: string;
}

export function useKeyboard(shortcuts: KeyboardShortcut[], enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = shortcut.ctrl ? e.ctrlKey || e.metaKey : !e.ctrlKey && !e.metaKey;
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
        const altMatch = shortcut.alt ? e.altKey : !e.altKey;

        if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
          e.preventDefault();
          shortcut.callback(e);
          break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts, enabled]);
}

// Common keyboard shortcuts
export const SHORTCUTS = {
  ESCAPE: { key: "Escape", description: "Close dialog/modal" },
  ENTER: { key: "Enter", description: "Confirm action" },
  ARROW_LEFT: { key: "ArrowLeft", description: "Previous item" },
  ARROW_RIGHT: { key: "ArrowRight", description: "Next item" },
  ARROW_UP: { key: "ArrowUp", description: "Scroll up" },
  ARROW_DOWN: { key: "ArrowDown", description: "Scroll down" },
  SPACE: { key: " ", description: "Play/Pause" },
  SLASH: { key: "/", description: "Focus search" },
  CTRL_S: { key: "s", ctrl: true, description: "Save" },
  CTRL_Z: { key: "z", ctrl: true, description: "Undo" },
  CTRL_SHIFT_Z: { key: "z", ctrl: true, shift: true, description: "Redo" },
};
