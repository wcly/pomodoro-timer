import { useEffect, useMemo, useRef, useState } from "react";
import type { TimerDurations, TimerMode } from "./types";

interface TimerHookOptions {
  onSecondElapsed?: () => void;
  onFinished?: () => void;
}

export function usePomodoroTimer(
  durations: TimerDurations,
  options: TimerHookOptions = {},
) {
  const [mode, setMode] = useState<TimerMode>("focus");
  const [isRunning, setIsRunning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(durations.focus);
  const optionsRef = useRef(options);

  optionsRef.current = options;

  const modeDuration = useMemo(() => durations[mode], [durations, mode]);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setRemainingSeconds((current) => {
        const nextValue = current - 1;

        optionsRef.current.onSecondElapsed?.();

        if (nextValue <= 0) {
          window.clearInterval(intervalId);
          setIsRunning(false);
          optionsRef.current.onFinished?.();
          return 0;
        }

        return nextValue;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [isRunning]);

  function start() {
    if (remainingSeconds <= 0) {
      return;
    }

    setIsRunning(true);
  }

  function pause() {
    setIsRunning(false);
  }

  function reset(nextMode: TimerMode = mode) {
    setIsRunning(false);
    setMode(nextMode);
    setRemainingSeconds(durations[nextMode]);
  }

  function changeMode(nextMode: TimerMode) {
    if (isRunning) {
      return;
    }

    reset(nextMode);
  }

  return {
    mode,
    isRunning,
    remainingSeconds,
    modeDuration,
    start,
    pause,
    reset,
    changeMode,
  };
}
