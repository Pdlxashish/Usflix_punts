/**
 * LiveDrawingCanvas
 * Real-time collaborative drawing canvas with partner.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@clerk/clerk-react";
import { Loader2, Trash2, Palette, Pencil } from "lucide-react";
import { useLinkStatus } from "@/context/link-status";
import { useWebSocketEvent } from "@/context/websocket";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  id: string;
  points: Point[];
  color: string;
  width: number;
  userId?: number;
}

const COLORS = [
  "#000000", // Black
  "#EF4444", // Red
  "#F59E0B", // Orange
  "#10B981", // Green
  "#3B82F6", // Blue
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#FFFFFF", // White
];

const BRUSH_SIZES = [2, 4, 6, 8, 12];

export function LiveDrawingCanvas() {
  const toast = useToast();
  const { getToken, isSignedIn } = useAuth();
  const { isLinked, partner } = useLinkStatus();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [selectedColor, setSelectedColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(4);
  const [isLoading, setIsLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);

  // Fetch existing drawings
  const fetchDrawings = useCallback(async () => {
    if (!isSignedIn || !isLinked) return;

    setIsLoading(true);

    try {
      const token = await getToken();
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/shared/drawing`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.ok && data.drawings) {
          setStrokes(data.drawings.map((d: any) => ({
            id: d.id,
            points: d.points,
            color: d.color,
            width: d.width,
            userId: d.userId,
          })));
        }
      }
    } catch (err) {
      console.error("Error fetching drawings:", err);
    } finally {
      setIsLoading(false);
    }
  }, [isSignedIn, isLinked, getToken]);

  useEffect(() => {
    fetchDrawings();
  }, [fetchDrawings]);

  // Redraw canvas whenever strokes change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw all strokes
    strokes.forEach((stroke) => {
      if (stroke.points.length < 2) return;

      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }

      ctx.stroke();
    });
  }, [strokes]);

  const getCanvasCoordinates = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const handleStartDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    const point = getCanvasCoordinates(e);
    setCurrentStroke([point]);
  };

  const handleDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();

    const point = getCanvasCoordinates(e);
    setCurrentStroke((prev) => [...prev, point]);

    // Draw current stroke in real-time
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    ctx.strokeStyle = selectedColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (currentStroke.length > 0) {
      ctx.beginPath();
      ctx.moveTo(currentStroke[currentStroke.length - 1].x, currentStroke[currentStroke.length - 1].y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    }
  };

  const handleEndDrawing = async () => {
    if (!isDrawing || currentStroke.length < 2) {
      setIsDrawing(false);
      setCurrentStroke([]);
      return;
    }

    setIsDrawing(false);

    try {
      const data = await api.post<{
        ok: boolean;
        strokeId?: string;
        error?: string;
      }>("/shared/drawing/stroke", {
        points: currentStroke,
        color: selectedColor,
        width: brushSize,
      });

      if (data.ok && data.strokeId) {
        const newStroke: Stroke = {
          id: data.strokeId,
          points: currentStroke,
          color: selectedColor,
          width: brushSize,
        };
        setStrokes((prev) => [...prev, newStroke]);
      }
    } catch (err) {
      console.error("Error saving stroke:", err);
      toast.error("Failed to save drawing");
    } finally {
      setCurrentStroke([]);
    }
  };

  const handleClearCanvas = async () => {
    if (!window.confirm("Clear the entire canvas? This cannot be undone.")) {
      return;
    }

    setIsClearing(true);

    try {
      const data = await api.delete<{
        ok: boolean;
        error?: string;
      }>("/shared/drawing");

      if (data.ok) {
        setStrokes([]);
        toast.success("Canvas cleared");
      } else {
        toast.error(data.error || "Failed to clear canvas");
      }
    } catch (err) {
      console.error("Error clearing canvas:", err);
      toast.error("Failed to clear canvas");
    } finally {
      setIsClearing(false);
    }
  };

  // Listen for partner's drawing strokes via WebSocket
  useWebSocketEvent("drawing:stroke", useCallback((data: any) => {
    const newStroke: Stroke = {
      id: data.strokeId,
      points: data.points,
      color: data.color,
      width: data.width,
      userId: data.userId,
    };
    setStrokes((prev) => [...prev, newStroke]);
  }, []));

  // Listen for canvas clear events
  useWebSocketEvent("drawing:clear", useCallback(() => {
    setStrokes([]);
    toast.success(`${partner?.name || "Partner"} cleared the canvas`);
  }, [partner, toast]));

  if (!isLinked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-muted/30 rounded-xl p-8">
        <Palette className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No Partner Linked</h3>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          Link with your partner to draw together in real-time.
        </p>
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl text-foreground">Live Drawing</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Draw together with {partner?.name || "your partner"} in real-time
          </p>
        </div>
        <button
          type="button"
          onClick={handleClearCanvas}
          disabled={isClearing || strokes.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-destructive/40 text-destructive hover:bg-destructive/10 disabled:opacity-50 text-sm"
        >
          {isClearing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          Clear Canvas
        </button>
      </div>

      {/* Drawing Tools */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/30 rounded-lg border border-border">
        {/* Color Picker */}
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-muted-foreground" />
          <div className="flex gap-1.5">
            {COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setSelectedColor(color)}
                className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                  selectedColor === color ? "border-primary scale-110" : "border-transparent"
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>

        {/* Brush Size */}
        <div className="flex items-center gap-2">
          <Pencil className="h-4 w-4 text-muted-foreground" />
          <div className="flex gap-1.5">
            {BRUSH_SIZES.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setBrushSize(size)}
                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-transform hover:scale-110 ${
                  brushSize === size ? "border-primary bg-primary/10 scale-110" : "border-border"
                }`}
                title={`${size}px`}
              >
                <div
                  className="rounded-full bg-foreground"
                  style={{ width: size, height: size }}
                />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative bg-white rounded-xl overflow-hidden border-2 border-border shadow-lg">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          onMouseDown={handleStartDrawing}
          onMouseMove={handleDraw}
          onMouseUp={handleEndDrawing}
          onMouseLeave={handleEndDrawing}
          onTouchStart={handleStartDrawing}
          onTouchMove={handleDraw}
          onTouchEnd={handleEndDrawing}
          className="w-full h-auto cursor-crosshair touch-none"
          style={{ touchAction: "none" }}
        />
      </div>
    </div>
  );
}
