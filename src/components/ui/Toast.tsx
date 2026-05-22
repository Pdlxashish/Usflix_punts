/**
 * Toast notification system for success/error/info messages
 */
import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { CheckCircle, AlertCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (type: ToastType, message: string, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((type: ToastType, message: string, duration = 5000) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const toast: Toast = { id, type, message, duration };
    
    setToasts((prev) => [...prev, toast]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const success = useCallback((message: string, duration?: number) => {
    showToast("success", message, duration);
  }, [showToast]);

  const error = useCallback((message: string, duration?: number) => {
    showToast("error", message, duration);
  }, [showToast]);

  const info = useCallback((message: string, duration?: number) => {
    showToast("info", message, duration);
  }, [showToast]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, success, error, info }}>
      {children}
      
      {/* Toast container */}
      <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-3 max-w-md">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-start gap-3 px-4 py-3 rounded-lg shadow-[var(--shadow-card)] border backdrop-blur-sm animate-in slide-in-from-right duration-300 ${
              toast.type === "success"
                ? "bg-primary/10 border-primary/30 text-primary"
                : toast.type === "error"
                ? "bg-destructive/10 border-destructive/30 text-destructive"
                : "bg-card/90 border-border/60 text-foreground"
            }`}
          >
            {toast.type === "success" && <CheckCircle className="h-5 w-5 shrink-0 mt-0.5" />}
            {toast.type === "error" && <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />}
            {toast.type === "info" && <Info className="h-5 w-5 shrink-0 mt-0.5" />}
            
            <p className="flex-1 text-sm font-medium leading-relaxed">{toast.message}</p>
            
            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 text-current/60 hover:text-current transition-colors"
              aria-label="Close notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
