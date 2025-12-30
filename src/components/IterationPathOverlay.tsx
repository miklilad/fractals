import { useEffect, useRef } from "react";
import type { Position } from "../types";
import {
  calculateMandelbrotIterations,
  complexToScreen,
  screenToComplex,
} from "../lib/mandelbrotUtils";

interface IterationPathOverlayProps {
  isActive: boolean;
  complexCoord: { x: number; y: number } | null;
  setComplexCoord: (pos: { x: number; y: number } | null) => void;
  position: Position;
  targetCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  isFrozen: boolean;
  toggleFrozen: () => void;
}

const drawIterationPath = (
  ctx: CanvasRenderingContext2D,
  iterations: { x: number; y: number }[],
  canvasWidth: number,
  canvasHeight: number,
  position: Position,
  complexCoord: { x: number; y: number }
) => {
  if (iterations.length < 2) return;

  // Draw the iteration path
  ctx.strokeStyle = "#00ff00";
  ctx.lineWidth = 2;
  ctx.beginPath();

  const firstScreen = complexToScreen(
    iterations[0].x,
    iterations[0].y,
    canvasWidth,
    canvasHeight,
    position
  );
  ctx.moveTo(firstScreen.x, firstScreen.y);

  for (let i = 1; i < iterations.length; i++) {
    const screen = complexToScreen(
      iterations[i].x,
      iterations[i].y,
      canvasWidth,
      canvasHeight,
      position
    );
    ctx.lineTo(screen.x, screen.y);
  }

  ctx.stroke();

  // Draw points at each iteration
  ctx.fillStyle = "#ff0000";
  iterations.forEach((iter, idx) => {
    const screen = complexToScreen(
      iter.x,
      iter.y,
      canvasWidth,
      canvasHeight,
      position
    );

    ctx.beginPath();
    ctx.arc(screen.x, screen.y, 3, 0, 2 * Math.PI);
    ctx.fill();

    // Label first few iterations
    if (idx < 10) {
      ctx.fillStyle = "#ffffff";
      ctx.font = "12px monospace";
      ctx.fillText(idx.toString(), screen.x + 5, screen.y - 5);
      ctx.fillStyle = "#ff0000";
    }
  });

  // Draw starting point (the complex coordinate)
  const startScreen = complexToScreen(
    complexCoord.x,
    complexCoord.y,
    canvasWidth,
    canvasHeight,
    position
  );
  ctx.fillStyle = "#0000ff";
  ctx.beginPath();
  ctx.arc(startScreen.x, startScreen.y, 5, 0, 2 * Math.PI);
  ctx.fill();

  // Label the complex coordinate
  ctx.fillStyle = "#ffffff";
  ctx.font = "14px monospace";
  ctx.fillText(
    `c = ${complexCoord.x.toFixed(4)} + ${complexCoord.y.toFixed(4)}i`,
    startScreen.x + 10,
    startScreen.y
  );
};

export const IterationPathOverlay = ({
  isActive,
  complexCoord,
  setComplexCoord,
  position,
  targetCanvasRef,
  isFrozen,
  toggleFrozen,
}: IterationPathOverlayProps) => {
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const lastMousePosRef = useRef<{ x: number; y: number } | null>(null);

  // Handle mouse movement for iteration visualization
  useEffect(() => {
    if (!isActive) return;

    const canvas = targetCanvasRef.current;
    if (!canvas) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;

      // Always track the mouse position
      lastMousePosRef.current = { x: screenX, y: screenY };

      // Only update complex coord if not frozen
      if (!isFrozen) {
        const complex = screenToComplex(
          screenX,
          screenY,
          canvas.width,
          canvas.height,
          position
        );
        setComplexCoord(complex);
      }
    };

    canvas.addEventListener("mousemove", handleMouseMove);

    return () => {
      canvas.removeEventListener("mousemove", handleMouseMove);
    };
  }, [isActive, isFrozen, position, targetCanvasRef, setComplexCoord]);

  // Update complex coord immediately when unfreezing
  useEffect(() => {
    if (!isActive || isFrozen) return;

    const canvas = targetCanvasRef.current;
    if (!canvas || !lastMousePosRef.current) return;

    const { x: screenX, y: screenY } = lastMousePosRef.current;
    const complex = screenToComplex(
      screenX,
      screenY,
      canvas.width,
      canvas.height,
      position
    );
    setComplexCoord(complex);
  }, [isActive, isFrozen, position, targetCanvasRef, setComplexCoord]);

  // Handle click to freeze/unfreeze (only short clicks, not drags)
  useEffect(() => {
    if (!isActive) return;

    const canvas = targetCanvasRef.current;
    if (!canvas) return;

    let mouseDownTime = 0;
    let mouseDownPos = { x: 0, y: 0 };
    const MAX_CLICK_DURATION = 200; // milliseconds
    const MAX_MOVE_DISTANCE = 5; // pixels

    const handleMouseDown = (e: MouseEvent) => {
      mouseDownTime = Date.now();
      mouseDownPos = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = (e: MouseEvent) => {
      const duration = Date.now() - mouseDownTime;
      const distance = Math.sqrt(
        Math.pow(e.clientX - mouseDownPos.x, 2) +
          Math.pow(e.clientY - mouseDownPos.y, 2)
      );

      // Only toggle if it was a short click and didn't move much
      if (duration < MAX_CLICK_DURATION && distance < MAX_MOVE_DISTANCE) {
        toggleFrozen();
      }
    };

    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mouseup", handleMouseUp);

    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isActive, targetCanvasRef, toggleFrozen]);

  // Draw iteration path on overlay canvas
  useEffect(() => {
    const overlayCanvas = overlayCanvasRef.current;
    if (!overlayCanvas) return;

    const ctx = overlayCanvas.getContext("2d");
    if (!ctx) return;

    // Clear the overlay
    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    if (!isActive || !complexCoord) return;

    // Calculate iterations using the complex coordinate
    const iterations = calculateMandelbrotIterations(
      complexCoord.x,
      complexCoord.y
    );

    drawIterationPath(
      ctx,
      iterations,
      overlayCanvas.width,
      overlayCanvas.height,
      position,
      complexCoord
    );
  }, [isActive, complexCoord, position]);

  // Sync canvas size with target canvas
  useEffect(() => {
    const targetCanvas = targetCanvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    if (!targetCanvas || !overlayCanvas) return;

    const resizeObserver = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) {
        const width = entry.contentRect.width;
        const height = entry.contentRect.height;
        overlayCanvas.width = width;
        overlayCanvas.height = height;
      }
    });

    resizeObserver.observe(targetCanvas);
    return () => resizeObserver.disconnect();
  }, [targetCanvasRef]);

  return (
    <canvas
      id="overlay-canvas"
      className="pointer-events-none absolute top-0 left-0 h-full w-full"
      ref={overlayCanvasRef}
    />
  );
};
