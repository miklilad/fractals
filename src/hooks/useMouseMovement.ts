import { useEffect, useRef } from "react";

// Pure function to calculate new position based on mouse delta
const calculateNewPosition = (
  currentPosition: { x: number; y: number; z: number },
  mouseDelta: { x: number; y: number },
  canvasSize: { width: number; height: number }
): { x: number; y: number; z: number } => {
  const scaleFactor = (currentPosition.z / canvasSize.width) * 2;
  const ratio = canvasSize.width / canvasSize.height;

  return {
    x: currentPosition.x - mouseDelta.x * scaleFactor,
    y: currentPosition.y + mouseDelta.y * scaleFactor * ratio, // Invert y for natural movement
    z: currentPosition.z,
  };
};

// Pure function to calculate new z position (zoom level) based on scroll delta
const calculateNewZoom = (
  currentZ: number,
  scrollDelta: number,
  zoomFactor: number = 0.1
): number => {
  const zoomMultiplier = 1 + scrollDelta * zoomFactor;
  return currentZ * zoomMultiplier;
};

// Pure function to calculate distance between two touch points
const calculateTouchDistance = (
  touch1: { x: number; y: number },
  touch2: { x: number; y: number }
): number => {
  const dx = touch2.x - touch1.x;
  const dy = touch2.y - touch1.y;
  return Math.sqrt(dx * dx + dy * dy);
};

interface UseMouveMovementProps {
  setPosition: React.Dispatch<
    React.SetStateAction<{
      x: number;
      y: number;
      z: number;
    }>
  >;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export const useMouseDragMovement = ({
  setPosition,
  canvasRef,
}: UseMouveMovementProps) => {
  const isDraggingRef = useRef(false);
  const lastMousePos = useRef<{ x: number; y: number } | null>(null);
  const lastTouchDistance = useRef<number | null>(null);

  // Handle mouse drag interactions
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !lastMousePos.current) return;

      const mouseDelta = {
        x: e.clientX - lastMousePos.current.x,
        y: e.clientY - lastMousePos.current.y,
      };

      setPosition(currentPosition =>
        calculateNewPosition(currentPosition, mouseDelta, {
          width: canvas.width,
          height: canvas.height,
        })
      );

      lastMousePos.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      lastMousePos.current = null;
    };

    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("mouseleave", handleMouseUp);

    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("mouseleave", handleMouseUp);
    };
  }, [isDraggingRef, canvasRef, setPosition]);

  // Handle mouse wheel scroll for zoom
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      // Normalize scroll delta (different browsers/devices have different scales)
      // Scroll down (positive deltaY) zooms in, scroll up (negative deltaY) zooms out
      const scrollDelta = Math.sign(e.deltaY) * 0.5;

      setPosition(currentPosition => ({
        ...currentPosition,
        z: calculateNewZoom(currentPosition.z, scrollDelta),
      }));
    };

    canvas.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      canvas.removeEventListener("wheel", handleWheel);
    };
  }, [canvasRef, setPosition]);

  // Handle touch interactions for pinch-to-zoom
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        // Initialize pinch gesture
        const touch1 = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        const touch2 = { x: e.touches[1].clientX, y: e.touches[1].clientY };
        lastTouchDistance.current = calculateTouchDistance(touch1, touch2);
      } else if (e.touches.length === 1) {
        // Initialize drag gesture
        isDraggingRef.current = true;
        lastMousePos.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();

      if (e.touches.length === 2 && lastTouchDistance.current !== null) {
        // Handle pinch gesture
        const touch1 = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        const touch2 = { x: e.touches[1].clientX, y: e.touches[1].clientY };
        const currentDistance = calculateTouchDistance(touch1, touch2);

        const distanceRatio = currentDistance / lastTouchDistance.current;
        // Pinch in (distanceRatio < 1) zooms in, pinch out (distanceRatio > 1) zooms out
        const zoomDelta = (1 - distanceRatio) * 4; // Amplify the zoom effect

        setPosition(currentPosition => ({
          ...currentPosition,
          z: calculateNewZoom(currentPosition.z, zoomDelta),
        }));

        lastTouchDistance.current = currentDistance;
      } else if (
        e.touches.length === 1 &&
        isDraggingRef.current &&
        lastMousePos.current
      ) {
        // Handle drag gesture
        const mouseDelta = {
          x: e.touches[0].clientX - lastMousePos.current.x,
          y: e.touches[0].clientY - lastMousePos.current.y,
        };

        setPosition(currentPosition =>
          calculateNewPosition(currentPosition, mouseDelta, {
            width: canvas.width,
            height: canvas.height,
          })
        );

        lastMousePos.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
      }
    };

    const handleTouchEnd = () => {
      isDraggingRef.current = false;
      lastMousePos.current = null;
      lastTouchDistance.current = null;
    };

    canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
    canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
    canvas.addEventListener("touchend", handleTouchEnd);
    canvas.addEventListener("touchcancel", handleTouchEnd);

    return () => {
      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchmove", handleTouchMove);
      canvas.removeEventListener("touchend", handleTouchEnd);
      canvas.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [isDraggingRef, canvasRef, setPosition]);
};
