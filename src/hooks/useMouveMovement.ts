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

  // Handle mouse interactions
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
};
