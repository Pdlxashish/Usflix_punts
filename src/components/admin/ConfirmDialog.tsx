import { useState, useEffect } from "react";
import { Trash2 } from "lucide-react";

export function ConfirmDialog({ title, message, onConfirm, onCancel, options }: {
  title: string; message: string;
  onConfirm: (option?: string) => void; onCancel: () => void;
  options?: { label: string; value: string }[];
}) {
  const [selected, setSelected] = useState(options?.[0]?.value ?? "");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-xl p-6 sm:p-8 max-w-md w-full shadow-[var(--shadow-card)]">
        <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
          <Trash2 className="h-6 w-6 text-destructive" />
        </div>
        <h3 className="font-display text-lg sm:text-xl mb-2 break-words">{title}</h3>
        <p className="text-sm text-muted-foreground mb-1 break-words">{message}</p>
        <p className="text-xs text-destructive font-medium mb-5">This action is permanent and cannot be undone.</p>
        {options && (
          <div className="space-y-2 mb-5">
            {options.map((o) => (
              <label key={o.value} className="flex items-start gap-3 cursor-pointer text-sm">
                <input type="radio" name="delete-option" value={o.value} checked={selected === o.value}
                  onChange={() => setSelected(o.value)} className="accent-primary mt-0.5 shrink-0" />
                <span className="break-words">{o.label}</span>
              </label>
            ))}
          </div>
        )}
        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
          <button onClick={onCancel} className="px-5 py-2.5 rounded-md text-sm border border-border hover:bg-card transition-colors">Cancel</button>
          <button onClick={() => onConfirm(selected)} className="px-5 py-2.5 rounded-md text-sm bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
