/**
 * Shared Canvas — Interactive drawing board for partners
 * - Auto-saves every stroke (2 s debounce)
 * - Subscribes to SSE stream so remote partner's strokes appear live
 */
import { useEffect, useState, useRef, useCallback } from "react";
import { Palette, Download, Eraser, Trash2, Undo, Redo, Save, CheckCircle, Wifi } from "lucide-react";
import { fetchApiJson } from "@/lib/fetchApi";
import { BACKEND_URL } from "@/lib/api";

interface CanvasData {
  id: string | null;
  drawingData: string;
  title: string;
  isActive: boolean;
}

interface DrawingState {
  paths: Path[];
  currentPath: Point[];
}

interface Point {
  x: number;
  y: number;
}

interface Path {
  points: Point[];
  color: string;
  width: number;
}

const COLORS = [
  "#e50914", // Primary red
  "#ff6b6b", // Light red
  "#4ecdc4", // Teal
  "#45b7d1", // Blue
  "#f7b731", // Yellow
  "#5f27cd", // Purple
  "#00d2d3", // Cyan
  "#ff9ff3", // Pink
  "#54a0ff", // Light blue
  "#48dbfb", // Sky blue
  "#1dd1a1", // Green
  "#feca57", // Orange
  "#000000", // Black
  "#ffffff", // White
];

export function SharedCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState(COLORS[0]);
  const [brushSize, setBrushSize] = useState(3);
  const [drawingState, setDrawingState] = useState<DrawingState>({ paths: [], currentPath: [] });
  const [history, setHistory] = useState<DrawingState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [loading, setLoading] = useState(true);
  const [canvasData, setCanvasData] = useState<CanvasData | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isEraser, setIsEraser] = useState(false);
  const isDrawingRef = useRef(false); // track drawing without triggering re-renders
  const [remoteConnected, setRemoteConnected] = useState(false);

  // Load canvas data
  useEffect(() => {
    fetchApiJson<CanvasData>("/canvas/current")
      .then((data) => {
        setCanvasData(data);
        if (data.drawingData) {
          try {
            const parsed = JSON.parse(data.drawingData);
            if (parsed.paths) {
              setDrawingState({ paths: parsed.paths, currentPath: [] });
              setHistory([{ paths: parsed.paths, currentPath: [] }]);
              setHistoryIndex(0);
            }
          } catch {
            // Invalid data, start fresh
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // ── SSE: subscribe to live canvas updates from the remote partner ────────────
  useEffect(() => {
    const es = new EventSource(`${BACKEND_URL}/api/canvas/stream`);

    es.onopen = () => setRemoteConnected(true);
    es.onerror = () => setRemoteConnected(false);

    es.onmessage = (event) => {
      // Ignore updates that arrive while the local user is actively drawing
      // to avoid interrupting their current stroke.
      if (isDrawingRef.current) return;

      try {
        const { drawingData } = JSON.parse(event.data) as { drawingData: string };
        const parsed = JSON.parse(drawingData) as { paths?: Path[] };
        if (!parsed.paths) return;

        setDrawingState((prev) => {
          // Only update if the remote state actually differs (avoids echo from own saves)
          if (JSON.stringify(prev.paths) === JSON.stringify(parsed.paths)) return prev;
          return { paths: parsed.paths!, currentPath: [] };
        });
      } catch {
        // Malformed event — ignore
      }
    };

    return () => {
      es.close();
      setRemoteConnected(false);
    };
  }, []);

  // Auto-save drawing with 2s debounce after each stroke
  const scheduleSave = useCallback((state: DrawingState) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus("saving");
    saveTimerRef.current = setTimeout(async () => {
      try {
        await fetchApiJson("/canvas/current", {
          method: "PATCH",
          body: JSON.stringify({ drawingData: JSON.stringify({ paths: state.paths }) }),
        });
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch {
        setSaveStatus("idle");
      }
    }, 2000);
  }, []);

  // Redraw canvas whenever state changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw all paths
    drawingState.paths.forEach((path) => {
      if (path.points.length < 2) return;
      
      ctx.strokeStyle = path.color;
      ctx.lineWidth = path.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      
      ctx.beginPath();
      ctx.moveTo(path.points[0].x, path.points[0].y);
      
      for (let i = 1; i < path.points.length; i++) {
        ctx.lineTo(path.points[i].x, path.points[i].y);
      }
      
      ctx.stroke();
    });

    // Draw current path
    if (drawingState.currentPath.length > 1) {
      ctx.strokeStyle = isEraser ? "#0a0a0a" : color;
      ctx.lineWidth = isEraser ? brushSize * 3 : brushSize;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      
      ctx.beginPath();
      ctx.moveTo(drawingState.currentPath[0].x, drawingState.currentPath[0].y);
      
      for (let i = 1; i < drawingState.currentPath.length; i++) {
        ctx.lineTo(drawingState.currentPath[i].x, drawingState.currentPath[i].y);
      }
      
      ctx.stroke();
    }
  }, [drawingState, color, brushSize, isEraser]);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ("touches" in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    } else {
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const point = getCoordinates(e);
    if (!point) return;

    isDrawingRef.current = true;
    setIsDrawing(true);
    setDrawingState((prev) => ({ ...prev, currentPath: [point] }));
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const point = getCoordinates(e);
    if (!point) return;

    setDrawingState((prev) => ({
      ...prev,
      currentPath: [...prev.currentPath, point],
    }));
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    
    isDrawingRef.current = false;
    setIsDrawing(false);
    
    if (drawingState.currentPath.length > 1) {
      const activeColor = isEraser ? "#0a0a0a" : color;
      const activeWidth = isEraser ? brushSize * 3 : brushSize;
      const newPath: Path = {
        points: drawingState.currentPath,
        color: activeColor,
        width: activeWidth,
      };
      
      const newState = {
        paths: [...drawingState.paths, newPath],
        currentPath: [],
      };
      
      setDrawingState(newState);
      
      // Add to history
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newState);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);

      // Auto-save after stroke
      scheduleSave(newState);
    } else {
      setDrawingState((prev) => ({ ...prev, currentPath: [] }));
    }
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setDrawingState(history[historyIndex - 1]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setDrawingState(history[historyIndex + 1]);
    }
  };

  const clearCanvas = () => {
    const newState = { paths: [], currentPath: [] };
    setDrawingState(newState);
    setHistory([newState]);
    setHistoryIndex(0);
    scheduleSave(newState);
  };

  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement("a");
    link.download = `canvas-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  if (loading) {
    return (
      <section className="relative py-24 px-6 lg:px-12">
        <div className="max-w-4xl mx-auto">
          <div className="h-96 rounded-xl bg-card/40 animate-pulse" />
        </div>
      </section>
    );
  }

  return (
    <section className="relative py-16 sm:py-24 px-4 sm:px-6 lg:px-12 overflow-hidden">
      {/* Background glow */}
      <div
        className="absolute inset-0 -z-10 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 50% 60%, oklch(0.2 0.07 280 / 0.4) 0%, transparent 70%)",
        }}
      />

      <div className="max-w-4xl mx-auto">
        {/* Heading */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="h-px w-8 bg-primary" />
            <p className="text-xs uppercase tracking-[0.4em] text-primary flex items-center gap-2">
              <Palette className="h-3.5 w-3.5" /> Draw Together
            </p>
            <span className="h-px w-8 bg-primary" />
          </div>
          <h2 className="font-display text-4xl sm:text-5xl md:text-6xl mb-4">
            Our <span className="text-primary italic">Canvas</span>
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            A shared space to draw, doodle, and create together
          </p>
        </div>

        {/* Toolbar */}
        <div className="bg-card/60 border border-border/60 rounded-xl p-3 sm:p-4 mb-4">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            {/* Colors */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-muted-foreground shrink-0">Color:</span>
              <div className="flex flex-wrap gap-1.5">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => { setColor(c); setIsEraser(false); }}
                    className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 transition-all ${
                      color === c && !isEraser ? "border-primary scale-110" : "border-transparent hover:scale-105"
                    }`}
                    style={{ backgroundColor: c }}
                    aria-label={`Select color ${c}`}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {/* Brush size */}
              <div className="flex items-center gap-2 flex-1 sm:flex-none">
                <span className="text-xs text-muted-foreground shrink-0">Size:</span>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={brushSize}
                  onChange={(e) => setBrushSize(parseInt(e.target.value))}
                  className="w-20 sm:w-24"
                />
                <span className="text-xs text-muted-foreground w-5">{brushSize}</span>
              </div>

              {/* Eraser toggle */}
              <button
                onClick={() => setIsEraser((v) => !v)}
                className={`p-2 rounded-md transition-colors ${
                  isEraser ? "bg-primary text-primary-foreground" : "hover:bg-card text-muted-foreground hover:text-foreground"
                }`}
                title="Eraser"
                aria-pressed={isEraser}
              >
                <Eraser className="h-4 w-4" />
              </button>

              {/* Actions */}
              <div className="flex items-center gap-1 ml-auto sm:ml-0">
                <button
                  onClick={undo}
                  disabled={historyIndex <= 0}
                  className="p-2 rounded-md hover:bg-card transition-colors disabled:opacity-30"
                  title="Undo"
                >
                  <Undo className="h-4 w-4" />
                </button>
                <button
                  onClick={redo}
                  disabled={historyIndex >= history.length - 1}
                  className="p-2 rounded-md hover:bg-card transition-colors disabled:opacity-30"
                  title="Redo"
                >
                  <Redo className="h-4 w-4" />
                </button>
                <button
                  onClick={clearCanvas}
                  className="p-2 rounded-md hover:bg-card transition-colors text-destructive"
                  title="Clear canvas"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button
                  onClick={downloadCanvas}
                  className="p-2 rounded-md hover:bg-card transition-colors"
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </button>
              </div>

              {/* Save status + live indicator */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground ml-1">
                {saveStatus === "saving" && (
                  <span className="flex items-center gap-1 animate-pulse">
                    <Save className="h-3.5 w-3.5" /> Saving…
                  </span>
                )}
                {saveStatus === "saved" && (
                  <span className="flex items-center gap-1 text-green-500">
                    <CheckCircle className="h-3.5 w-3.5" /> Saved
                  </span>
                )}
                <span
                  className={`flex items-center gap-1 ${remoteConnected ? "text-green-500" : "text-muted-foreground/50"}`}
                  title={remoteConnected ? "Live — updates sync in real-time" : "Connecting…"}
                >
                  <Wifi className="h-3.5 w-3.5" />
                  {remoteConnected ? "Live" : "…"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div className="bg-card/60 border border-border/60 rounded-xl p-4">
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className={`w-full h-auto rounded-lg touch-none ${isEraser ? "cursor-cell" : "cursor-crosshair"}`}
            style={{ maxHeight: "600px" }}
          />
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Draw with your mouse or finger. Changes save automatically and sync live to your partner.
        </p>
      </div>
    </section>
  );
}
