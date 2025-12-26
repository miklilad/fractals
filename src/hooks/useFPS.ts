import { useEffect, useRef, useState } from "react";

// Pure function to calculate FPS from frame times
const calculateFPS = (frameTimes: number[]): number => {
  if (frameTimes.length === 0) return 0;

  const averageFrameTime =
    frameTimes.reduce((sum, time) => sum + time, 0) / frameTimes.length;
  return Math.round(1000 / averageFrameTime);
};

// Pure function to update frame times array
const updateFrameTimes = (
  frameTimes: number[],
  newFrameTime: number,
  maxSamples: number
): number[] => {
  const updated = [...frameTimes, newFrameTime];
  return updated.length > maxSamples ? updated.slice(1) : updated;
};

export const useFPS = (sampleSize: number = 60) => {
  const [fps, setFps] = useState(0);
  const frameTimesRef = useRef<number[]>([]);
  const lastFrameTimeRef = useRef<number>(performance.now());
  const animationFrameRef = useRef<number>(0);

  useEffect(() => {
    const updateFPS = (currentTime: number) => {
      const deltaTime = currentTime - lastFrameTimeRef.current;
      lastFrameTimeRef.current = currentTime;

      // Update frame times using pure function
      frameTimesRef.current = updateFrameTimes(
        frameTimesRef.current,
        deltaTime,
        sampleSize
      );

      // Calculate and set FPS using pure function
      const currentFPS = calculateFPS(frameTimesRef.current);
      setFps(currentFPS);

      // Request next frame
      animationFrameRef.current = requestAnimationFrame(updateFPS);
    };

    // Start the animation loop
    animationFrameRef.current = requestAnimationFrame(updateFPS);

    // Cleanup function
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [sampleSize]);

  return fps;
};
