import { act, renderHook } from "@testing-library/react";
import { usePomodoroTimer } from "../usePomodoroTimer";

describe("usePomodoroTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("counts down once per second after start", () => {
    const onSecondElapsed = vi.fn();
    const { result } = renderHook(() =>
      usePomodoroTimer(
        { focus: 5, shortBreak: 3, longBreak: 10 },
        { onSecondElapsed },
      ),
    );

    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(2000));

    expect(result.current.remainingSeconds).toBe(3);
    expect(onSecondElapsed).toHaveBeenCalledTimes(2);
  });

  test("pauses and resets correctly", () => {
    const { result } = renderHook(() =>
      usePomodoroTimer({ focus: 5, shortBreak: 3, longBreak: 10 }),
    );

    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(1000));
    act(() => result.current.pause());
    act(() => vi.advanceTimersByTime(2000));
    act(() => result.current.reset());

    expect(result.current.remainingSeconds).toBe(5);
    expect(result.current.isRunning).toBe(false);
  });
});
