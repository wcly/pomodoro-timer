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
  const previousModeRef = useRef(mode);
  const previousModeDurationRef = useRef(durations.focus);
  const remainingSecondsRef = useRef(durations.focus);

  optionsRef.current = options;

  const modeDuration = useMemo(() => durations[mode], [durations, mode]);

  function syncRemainingSeconds(nextValue: number) {
    remainingSecondsRef.current = nextValue;
    setRemainingSeconds(nextValue);
  }

  useEffect(() => {
    const modeChanged = previousModeRef.current !== mode;
    const modeDurationChanged = previousModeDurationRef.current !== modeDuration;

    if (!isRunning && (modeChanged || modeDurationChanged)) {
      syncRemainingSeconds(modeDuration);
    }

    previousModeRef.current = mode;
    previousModeDurationRef.current = modeDuration;
  }, [isRunning, mode, modeDuration]);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const intervalId = window.setInterval(() => {
      const nextValue = remainingSecondsRef.current - 1;

      syncRemainingSeconds(Math.max(nextValue, 0));
      optionsRef.current.onSecondElapsed?.();

      if (nextValue <= 0) {
        window.clearInterval(intervalId);
        setIsRunning(false);
        optionsRef.current.onFinished?.();
      }
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
    syncRemainingSeconds(durations[nextMode]);
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
