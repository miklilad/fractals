import { useState } from "react";

export const useIterationPath = () => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [complexCoord, setComplexCoord] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [isFrozen, setIsFrozen] = useState(false);

  const toggleEnabled = () => {
    setIsEnabled(prev => !prev);
    if (isEnabled) {
      setComplexCoord(null);
      setIsFrozen(false);
    }
  };

  const toggleFrozen = () => {
    setIsFrozen(prev => !prev);
  };

  return {
    isEnabled,
    toggleEnabled,
    complexCoord,
    setComplexCoord,
    isFrozen,
    toggleFrozen,
  };
};
