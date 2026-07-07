import { render, screen } from "@testing-library/react";
import { SessionDetailPage } from "../screens/SessionDetailPage";
import type { SessionDetail } from "../types";

const detail: SessionDetail = {
  session: {
    id: "session-1",
    mode: "focus",
    startedAt: "2026-07-02T14:30:00+08:00",
    endedAt: "2026-07-02T15:00:00+08:00",
    durationSeconds: 1500,
  },
  usage: [
    {
      bundleId: "com.microsoft.VSCode",
      appName: "VS Code",
      durationSeconds: 660,
      percentage: 0.45,
    },
    {
      bundleId: "com.google.Chrome",
      appName: "Chrome",
      durationSeconds: 360,
      percentage: 0.25,
    },
    {
      bundleId: "com.apple.Terminal",
      appName: "Terminal",
      durationSeconds: 240,
      percentage: 0.15,
    },
  ],
};

test("renders the detail page with the updated ardot framed usage stack", () => {
  const { container } = render(<SessionDetailPage detail={detail} onBack={() => undefined} />);

  expect(screen.getByText("使用详情")).toBeInTheDocument();
  expect(screen.getByText("应用")).toBeInTheDocument();
  expect(screen.getByText("时长")).toBeInTheDocument();
  expect(screen.getByText("占比")).toBeInTheDocument();

  const summaryLabels = Array.from(
    container.querySelectorAll<HTMLElement>(".detail-session-card__label"),
  ).map((node) => node.textContent);
  const summaryValues = Array.from(
    container.querySelectorAll<HTMLElement>(".detail-session-card__value"),
  ).map((node) => node.textContent);

  expect(summaryLabels).toEqual(["时段", "总时长", "模式"]);
  expect(summaryValues).toEqual(["14:30 - 15:00", "25m", "专注"]);
  expect(container.querySelector(".detail-session-card__column--summary")).not.toBeInTheDocument();
  expect(container.querySelector(".detail-columns__dot")).not.toBeInTheDocument();

  const usageRows = container.querySelectorAll(".usage-row");
  expect(usageRows).toHaveLength(3);
  expect(usageRows[0]).toHaveClass("usage-row--framed");
  expect(usageRows[1]).toHaveClass("usage-row--framed");
  expect(usageRows[2]).toHaveClass("usage-row--framed");
  expect(container.querySelector(".sheet-deco--detail-accent")).toBeInTheDocument();
  expect(container.querySelector(".sheet-deco--detail-ink")).toBeInTheDocument();
});
