/**
 * Reusable confirmation dialog for destructive actions
 */
import { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  title: string;
  message: string | ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full mx-4 shadow-[var(--shadow-card)] animate-in zoom-in-95 duration-200">
        {/* Icon */}
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
          variant === "danger" 
            ? "bg-destructive/10 text-destructive" 
            : variant === "warning"
            ? "bg-amber-500/10 text-amber-500"
            : "bg-primary/10 text-primary"
        }`}>
          <AlertTriangle className="h-6 w-6" />
        </div>

        {/* Content */}
        <h3 className="font-display text-xl mb-2">{title}</h3>
        <div className="text-sm text-muted-foreground mb-6">
          {typeof message === "string" ? <p>{message}</p> : message}
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 rounded-md text-sm border border-border hover:bg-card/60 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-5 py-2.5 rounded-md text-sm font-medium transition-colors ${
              variant === "danger"
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : variant === "warning"
                ? "bg-amber-500 text-white hover:bg-amber-600"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
