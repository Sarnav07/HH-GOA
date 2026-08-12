"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import {
  drawCard,
  PHOTO_WINDOW,
  SIZES,
  type CardState,
  type Variant,
} from "@/lib/render";
import { fontsReady } from "@/lib/fonts";
import { coastReady } from "@/lib/coast";

export type PreviewHandle = {
  /** Renders a variant offscreen at full resolution. */
  toBlob: (variant: Variant) => Promise<Blob>;
};

type Props = {
  name: string;
  stack: string;
  title: string;
  serial: string;
  photo: ImageBitmap | null;
};

/**
 * Live card preview.
 *
 * The backing store is always the true card size, so the preview and the
 * download are the same pixels and CSS only scales it for display.
 *
 * Pan and zoom live in a ref, not state. Dragging a photo produces a pointer
 * event every frame; routing that through setState would re-render the tree
 * sixty times a second and stutter badly on a phone.
 */
const CardPreview = forwardRef<PreviewHandle, Props>(function CardPreview(
  { name, stack, title, serial, photo },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const transform = useRef({ offsetX: 0, offsetY: 0, zoom: 1 });
  const frame = useRef(0);
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const pinch = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStart = useRef<{ dist: number; zoom: number } | null>(null);
  const zoomRef = useRef<HTMLInputElement>(null);

  /** Single place that changes zoom, so the slider never drifts from state. */
  const setZoom = useCallback((next: number) => {
    const clamped = Math.min(4, Math.max(1, next));
    transform.current.zoom = clamped;
    if (zoomRef.current) zoomRef.current.value = String(clamped);
  }, []);

  const state = useCallback(
    (): CardState => ({
      name,
      stack,
      title,
      serial,
      photo,
      ...transform.current,
    }),
    [name, stack, title, serial, photo],
  );

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    drawCard(ctx, state(), "card");
  }, [state]);

  /** Coalesces bursts of pointer events into one paint per animation frame. */
  const schedule = useCallback(() => {
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      paint();
    });
  }, [paint]);

  useEffect(() => {
    let alive = true;
    Promise.all([fontsReady(), coastReady()]).then(() => {
      if (alive) paint();
    });
    return () => {
      alive = false;
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [paint]);

  // A fresh photo starts from a plain cover fit.
  useEffect(() => {
    transform.current = { offsetX: 0, offsetY: 0, zoom: 1 };
    if (zoomRef.current) zoomRef.current.value = "1";
    schedule();
  }, [photo, schedule]);

  useImperativeHandle(
    ref,
    () => ({
      async toBlob(variant) {
        await Promise.all([fontsReady(), coastReady()]);
        const { w, h } = SIZES[variant];
        const off = document.createElement("canvas");
        off.width = w;
        off.height = h;
        const ctx = off.getContext("2d");
        if (!ctx) throw new Error("Canvas 2D context unavailable");
        drawCard(ctx, state(), variant);

        return new Promise<Blob>((resolve, reject) => {
          off.toBlob(
            (blob) =>
              blob ? resolve(blob) : reject(new Error("Could not encode PNG")),
            "image/png",
          );
        });
      },
    }),
    [state],
  );

  /* ------------------------------------------------------------ gestures */

  const canvasScale = () => {
    const rect = canvasRef.current?.getBoundingClientRect();
    return rect ? SIZES.card.w / rect.width : 1;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!photo) return;
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    pinch.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pinch.current.size === 2) {
      const [a, b] = [...pinch.current.values()];
      pinchStart.current = {
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        zoom: transform.current.zoom,
      };
      drag.current = null;
      return;
    }
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!photo) return;
    if (!pinch.current.has(e.pointerId)) return;
    pinch.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pinch.current.size === 2 && pinchStart.current) {
      const [a, b] = [...pinch.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      setZoom((pinchStart.current.zoom * dist) / pinchStart.current.dist);
      schedule();
      return;
    }

    if (drag.current?.id !== e.pointerId) return;
    // Convert the screen delta into the window-relative units the renderer
    // pans in. PHOTO_WINDOW mirrors the values drawBadge lays out with.
    const scale = canvasScale();
    const d = PHOTO_WINDOW.r * 2;
    transform.current.offsetX += ((e.clientX - drag.current.x) * scale) / d;
    transform.current.offsetY += ((e.clientY - drag.current.y) * scale) / d;
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
    schedule();
  };

  const endPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    pinch.current.delete(e.pointerId);
    if (pinch.current.size < 2) pinchStart.current = null;
    if (drag.current?.id === e.pointerId) drag.current = null;
  };

  return (
    <div className="flex w-full max-w-[420px] flex-col gap-4 lg:max-w-[500px]">
      <canvas
        ref={canvasRef}
        width={SIZES.card.w}
        height={SIZES.card.h}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        aria-label={
          photo
            ? `Hacker House Goa 2026 builder pass for ${name || "your name"}. Drag to reposition your photo.`
            : "Hacker House Goa 2026 builder pass preview. Upload a photo to fill it in."
        }
        role="img"
        className={`w-full rounded-[16px] shadow-[0_18px_50px_rgba(0,26,18,0.22)] ${
          photo ? "cursor-grab touch-none active:cursor-grabbing" : ""
        }`}
      />

      {/*
        A slider rather than wheel-zoom. Hijacking the wheel over a sticky card
        fights the page scroll, and a range input is keyboard operable, which
        wheel and pinch are not.
      */}
      {photo ? (
        <label className="flex items-center gap-3">
          <span className="font-mono text-[11px] tracking-[0.18em] text-forest uppercase">
            Zoom
          </span>
          <input
            ref={zoomRef}
            type="range"
            min={1}
            max={4}
            step={0.01}
            defaultValue={1}
            onChange={(e) => {
              setZoom(Number(e.target.value));
              schedule();
            }}
            className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-forest/30 accent-pink-deep"
          />
        </label>
      ) : null}
    </div>
  );
});

export default CardPreview;
