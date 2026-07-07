import { render } from "@testing-library/react";
import { UsageRow } from "../components/UsageRow";

test("assigns distinct stable colors to usage rows", () => {
  const { container } = render(
    <>
      <UsageRow
        row={{
          bundleId: "com.google.Chrome",
          appName: "Google Chrome",
          durationSeconds: 294,
          percentage: 0.99,
        }}
        variant="framed"
      />
      <UsageRow
        row={{
          bundleId: "com.tencent.xinWeChat",
          appName: "微信",
          durationSeconds: 258,
          percentage: 0.86,
        }}
        variant="framed"
      />
      <UsageRow
        row={{
          bundleId: "com.openai.codex",
          appName: "Codex",
          durationSeconds: 6,
          percentage: 0.02,
        }}
        variant="framed"
      />
    </>,
  );

  const usageRows = Array.from(container.querySelectorAll<HTMLElement>(".usage-row"));
  const colors = usageRows.map((row) => row.style.getPropertyValue("--usage-accent").trim());

  expect(colors).toHaveLength(3);
  expect(colors.every(Boolean)).toBe(true);
  expect(new Set(colors).size).toBe(3);

  const rerendered = render(
    <UsageRow
      row={{
        bundleId: "com.google.Chrome",
        appName: "Google Chrome",
        durationSeconds: 300,
        percentage: 1,
      }}
      variant="framed"
    />,
  );

  expect(
    rerendered.container
      .querySelector<HTMLElement>(".usage-row")
      ?.style.getPropertyValue("--usage-accent")
      .trim(),
  ).toBe(colors[0]);
});

test("shows less-than label for sub-tenth-minute usage", () => {
  const { getByText } = render(
    <UsageRow
      row={{
        bundleId: "com.jetbrains.WebStorm",
        appName: "WebStorm",
        durationSeconds: 1,
        percentage: 0.001,
      }}
      variant="framed"
    />,
  );

  expect(getByText("<0.1m")).toBeInTheDocument();
});
