import { render, screen } from "@testing-library/react";
import { TimerPage } from "../screens/TimerPage";

function getChildIndex(parent: Element, child: Element | null): number {
  return Array.from(parent.children).indexOf(child as Element);
}

test("renders the timer page in the same structural order as the ardot design", () => {
  const { container } = render(
    <TimerPage
      currentMode="focus"
      modeDuration={1500}
      remainingSeconds={1500}
      completedCount={3}
      isRunning={true}
      onChangeMode={() => undefined}
      onStart={() => undefined}
      onPause={() => undefined}
      onReset={() => undefined}
      onOpenStats={() => undefined}
    />,
  );

  expect(screen.queryByText("当前记录：VS Code")).not.toBeInTheDocument();

  const timerFrame = container.querySelector(".timer-frame");
  expect(timerFrame).not.toBeNull();

  const statusBadge = container.querySelector(".status-badge");
  const modeTabs = container.querySelector(".mode-tabs");
  const timerDisplay = container.querySelector(".timer-display");
  const timerProgress = container.querySelector(".timer-progress");
  const actionRow = container.querySelector(".action-row");
  const sessionMeta = container.querySelector(".session-meta");
  const statsLinkButton = container.querySelector(".stats-link-button");

  expect(getChildIndex(timerFrame as Element, statusBadge)).toBeLessThan(
    getChildIndex(timerFrame as Element, modeTabs),
  );
  expect(getChildIndex(timerFrame as Element, modeTabs)).toBeLessThan(
    getChildIndex(timerFrame as Element, timerDisplay),
  );
  expect(getChildIndex(timerFrame as Element, timerDisplay)).toBeLessThan(
    getChildIndex(timerFrame as Element, timerProgress),
  );
  expect(getChildIndex(timerFrame as Element, timerProgress)).toBeLessThan(
    getChildIndex(timerFrame as Element, actionRow),
  );
  expect(getChildIndex(timerFrame as Element, actionRow)).toBeLessThan(
    getChildIndex(timerFrame as Element, sessionMeta),
  );
  expect(getChildIndex(timerFrame as Element, sessionMeta)).toBeLessThan(
    getChildIndex(timerFrame as Element, statsLinkButton),
  );
});
