/**
 * Admin panel — manage saved canvas drawings
 */
import { useState, useEffect } from "react";
import { Trash2, AlertCircle, Star, Eye } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

interface CanvasDrawing {
  id: string;
  profileId: string | null;
  drawingData: string;
  thumbnailUrl: string | null;
  title: string;
  isActive: boolean;
  createdAt: string;
}

export function CanvasAdmin() {
  const toast = useToast();
  const [canvases, setCanvases] = useState<CanvasDrawing[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const load = async () => {
    try {
      const data = await api.get<CanvasDrawing[]>("/canvas");
      setCanvases(data);
    } catch {
      setCanvases([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (id: string) => {
    try {
      await api.delete(`/canvas/${id}`);
      toast.success("Canvas deleted.");
      setDeleteTarget(null);
      await load();
    } catch {
      toast.error("Failed to delete.");
    }
  };

  const setActive = async (id: string) => {
    try {
      await api.patch(`/canvas/${id}/set-active`, {});
      toast.success("Set as active canvas!");
      await load();
    } catch {
      toast.error("Failed to set active.");
    }
  };

  const getPathCount = (drawingData: string): number => {
    try {
      const parsed = JSON.parse(drawingData);
      return parsed.paths?.length || 0;
    } catch {
      return 0;
    }
  };

  return (
    <div className="space-y-6">
      {/* Info box */}
      <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
        <p className="text-sm text-foreground mb-2">
          <strong>About Shared Canvas:</strong>
        </p>
        <p className="text-sm text-muted-foreground">
          The shared canvas allows you and your partner to draw together. Only one canvas can be
          active at a time. Drawings are automatically saved as you draw. You can view saved
          canvases here and switch between them.
        </p>
      </div>

      {/* List */}
      <div className="bg-card/50 border border-border/60 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            {canvases.length} saved canvas{canvases.length !== 1 ? "es" : ""}
          </p>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <Eye className="h-3.5 w-3.5" /> View Canvas on Homepage
          </a>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-lg bg-input/40 animate-pulse" />
            ))}
          </div>
        ) : canvases.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground italic mb-2">No saved canvases yet.</p>
            <p className="text-xs text-muted-foreground">
              Start drawing on the homepage to create your first canvas!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {canvases.map((canvas) => {
              const pathCount = getPathCount(canvas.drawingData);
              const date = new Date(canvas.createdAt).toLocaleDateString();

              return (
                <div
                  key={canvas.id}
                  className={`flex items-center gap-3 bg-input/40 border rounded-lg px-4 py-3 ${
                    canvas.isActive ? "border-primary/40" : "border-border/40"
                  }`}
                >
                  {/* Canvas preview placeholder */}
                  <div className="w-16 h-16 rounded bg-muted/50 flex items-center justify-center shrink-0">
                    <span className="text-2xl">🎨</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium">{canvas.title}</p>
                      {canvas.isActive && (
                        <span className="inline-flex items-center gap-1 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
                          <Star className="h-3 w-3 fill-current" /> Active
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {pathCount} stroke{pathCount !== 1 ? "s" : ""} • Created {date}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1 shrink-0">
                    {!canvas.isActive && (
                      <button
                        onClick={() => setActive(canvas.id)}
                        className="text-muted-foreground hover:text-primary transition-colors"
                        title="Set as active"
                      >
                        <Star className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {deleteTarget === canvas.id ? (
                      <div className="flex gap-1">
                        <button
                          onClick={() => remove(canvas.id)}
                          className="text-xs text-destructive font-medium"
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setDeleteTarget(null)}
                          className="text-xs text-muted-foreground"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteTarget(canvas.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        aria-label="Delete"
                        disabled={canvas.isActive}
                        title={canvas.isActive ? "Cannot delete active canvas" : "Delete"}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="bg-card/50 border border-border/60 rounded-xl p-5">
        <h3 className="font-medium text-sm mb-3">Tips:</h3>
        <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
          <li>Only one canvas can be active at a time</li>
          <li>The active canvas is shown on the homepage</li>
          <li>Drawings are saved automatically as you draw</li>
          <li>You can switch between saved canvases anytime</li>
          <li>Cannot delete the currently active canvas</li>
        </ul>
      </div>
    </div>
  );
}
