/**
 * Undo/Redo functionality hook
 */
import { useState, useCallback } from "react";

interface UndoAction<T = any> {
  id: string;
  description: string;
  undo: () => Promise<void> | void;
  redo: () => Promise<void> | void;
  data?: T;
}

export function useUndo(maxHistory = 10) {
  const [history, setHistory] = useState<UndoAction[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  const addAction = useCallback((action: Omit<UndoAction, "id">) => {
    const id = `action-${Date.now()}-${Math.random()}`;
    const newAction: UndoAction = { ...action, id };

    setHistory((prev) => {
      // Remove any actions after current index (they're now invalid)
      const newHistory = prev.slice(0, currentIndex + 1);
      // Add new action
      newHistory.push(newAction);
      // Keep only last maxHistory actions
      return newHistory.slice(-maxHistory);
    });
    
    setCurrentIndex((prev) => Math.min(prev + 1, maxHistory - 1));
  }, [currentIndex, maxHistory]);

  const undo = useCallback(async () => {
    if (currentIndex < 0) return null;

    const action = history[currentIndex];
    await action.undo();
    setCurrentIndex((prev) => prev - 1);
    
    return action;
  }, [history, currentIndex]);

  const redo = useCallback(async () => {
    if (currentIndex >= history.length - 1) return null;

    const action = history[currentIndex + 1];
    await action.redo();
    setCurrentIndex((prev) => prev + 1);
    
    return action;
  }, [history, currentIndex]);

  const canUndo = currentIndex >= 0;
  const canRedo = currentIndex < history.length - 1;
  const lastAction = currentIndex >= 0 ? history[currentIndex] : null;

  const clear = useCallback(() => {
    setHistory([]);
    setCurrentIndex(-1);
  }, []);

  return {
    addAction,
    undo,
    redo,
    canUndo,
    canRedo,
    lastAction,
    clear,
    history: history.slice(0, currentIndex + 1),
  };
}
