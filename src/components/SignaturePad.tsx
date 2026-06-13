/* ------------------------------------------------------------------ */
/* SignaturePad — minimal canvas-based signature capture.              */
/*                                                                     */
/* Uses pointer events + setPointerCapture for reliable cross-device   */
/* tracking (mouse, touch, stylus). DevicePixelRatio-aware so strokes  */
/* are crisp on high-DPI screens. Dark-mode aware via CSS variable.   */
/* ------------------------------------------------------------------ */

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  forwardRef,
} from "react";

import { Button } from "@/components/ui/button";

export type SignaturePadHandle = {
  /** True if the canvas has at least one drawn stroke. */
  hasStrokes: boolean;
  /** Export the current canvas content as a PNG data-URL. */
  toDataURL(): string;
  /** Clear all strokes. */
  clear(): void;
};

type Props = {
  /** Called whenever the stroke state changes (drawn/cleared). */
  onChange?: (hasStrokes: boolean) => void;
  className?: string;
};

export const SignaturePad = forwardRef<SignaturePadHandle, Props>(function SignaturePad(
  { onChange, className },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasStrokes, setHasStrokes] = useState(false);

  /* ── DPR-aware sizing ──────────────────────────────────────── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeObserver = new ResizeObserver(() => {
      const dpr = window.devicePixelRatio ?? 1;
      const rect = canvas.getBoundingClientRect();
      // Only resize if dimensions actually changed to avoid flicker
      if (
        canvas.width !== Math.round(rect.width * dpr) ||
        canvas.height !== Math.round(rect.height * dpr)
      ) {
        canvas.width = Math.round(rect.width * dpr);
        canvas.height = Math.round(rect.height * dpr);
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.scale(dpr, dpr);
        // Clear drawing state when resized — strokes are lost
        setHasStrokes(false);
        onChange?.(false);
      }
    });

    resizeObserver.observe(canvas);
    return () => resizeObserver.disconnect();
  }, [onChange]);

  /* ── Resolve ink color from CSS variable ───────────────────── */
  const getInkColor = useCallback((): string => {
    const canvas = canvasRef.current;
    if (!canvas) return "#000";
    // Use foreground CSS variable for dark-mode awareness
    const color = getComputedStyle(canvas).getPropertyValue("--foreground").trim();
    if (color) {
      // CSS variable is in HSL format e.g. "240 10% 3.9%"; wrap it
      return `hsl(${color})`;
    }
    return "#000";
  }, []);

  /* ── Pointer handlers ──────────────────────────────────────── */
  const getCtx = () => canvasRef.current?.getContext("2d") ?? null;

  const canvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    const ctx = getCtx();
    if (!ctx) return;
    const { x, y } = canvasCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = getInkColor();
    ctx.lineWidth = 1.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = getCtx();
    if (!ctx) return;
    const { x, y } = canvasCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handlePointerUp = () => {
    if (!drawing.current) return;
    drawing.current = false;
    setHasStrokes(true);
    onChange?.(true);
  };

  /* ── Clear ─────────────────────────────────────────────────── */
  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasStrokes(false);
    onChange?.(false);
  }, [onChange]);

  /* ── Exposed handle ────────────────────────────────────────── */
  useImperativeHandle(
    ref,
    () => ({
      get hasStrokes() {
        return hasStrokes;
      },
      toDataURL() {
        return canvasRef.current?.toDataURL("image/png") ?? "";
      },
      clear,
    }),
    [hasStrokes, clear],
  );

  return (
    <div className={`flex flex-col gap-2 ${className ?? ""}`}>
      <canvas
        ref={canvasRef}
        /* 3:1 aspect ratio — matches the plan's spec */
        style={{ aspectRatio: "3 / 1", width: "100%", touchAction: "none" }}
        className="rounded border border-input bg-background cursor-crosshair"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {hasStrokes ? "Unterschrift erfasst" : "Hier unterschreiben"}
        </span>
        {hasStrokes && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={clear}
          >
            Löschen
          </Button>
        )}
      </div>
    </div>
  );
});
