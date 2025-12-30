import type { Position } from "../types";

// Calculate Mandelbrot iterations for a given point
export const calculateMandelbrotIterations = (
  cx: number,
  cy: number,
  maxIterations: number = 1000
): { x: number; y: number }[] => {
  const iterations: { x: number; y: number }[] = [{ x: 0, y: 0 }];
  let zx = 0.0;
  let zy = 0.0;

  for (let i = 0; i < maxIterations; i++) {
    const zxSquared = zx * zx;
    const zySquared = zy * zy;

    if (zxSquared + zySquared > 4.0) {
      break;
    }

    const xtemp = zxSquared - zySquared + cx;
    zy = 2.0 * zx * zy + cy;
    zx = xtemp;

    iterations.push({ x: zx, y: zy });
  }

  return iterations;
};

// Convert screen coordinates to complex plane coordinates
export const screenToComplex = (
  screenX: number,
  screenY: number,
  canvasWidth: number,
  canvasHeight: number,
  position: Position
): { x: number; y: number } => {
  const ratio = canvasWidth / canvasHeight;
  const min2x = position.x - position.z;
  const min2y = position.y - position.z / ratio;
  const max2x = position.x + position.z;
  const max2y = position.y + position.z / ratio;

  const cx = min2x + (screenX / canvasWidth) * (max2x - min2x);
  const cy = max2y - (screenY / canvasHeight) * (max2y - min2y);

  return { x: cx, y: cy };
};

// Convert complex plane coordinates to screen coordinates
export const complexToScreen = (
  cx: number,
  cy: number,
  canvasWidth: number,
  canvasHeight: number,
  position: Position
): { x: number; y: number } => {
  const ratio = canvasWidth / canvasHeight;
  const min2x = position.x - position.z;
  const min2y = position.y - position.z / ratio;
  const max2x = position.x + position.z;
  const max2y = position.y + position.z / ratio;

  const screenX = ((cx - min2x) / (max2x - min2x)) * canvasWidth;
  const screenY = ((max2y - cy) / (max2y - min2y)) * canvasHeight;

  return { x: screenX, y: screenY };
};

