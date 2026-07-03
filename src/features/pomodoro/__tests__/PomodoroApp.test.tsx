import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PomodoroApp } from "../PomodoroApp";

test("renders the timer page first and can navigate to stats and detail", async () => {
  const user = userEvent.setup();

  render(<PomodoroApp />);

  expect(screen.getByText("25:00")).toBeInTheDocument();
  expect(screen.getByText("专注", { selector: ".status-badge" })).toBeInTheDocument();
  expect(screen.getByText("当前记录：VS Code")).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: /查看统计/i }));
  expect(screen.getByText("使用统计")).toBeInTheDocument();

  await user.click(screen.getAllByRole("button", { name: /查看详情/i })[1]);
  expect(screen.getByText("使用详情")).toBeInTheDocument();
  expect(screen.getByText("Obsidian")).toBeInTheDocument();
  expect(screen.getByText("Safari")).toBeInTheDocument();
  expect(screen.queryByText("VS Code")).not.toBeInTheDocument();
});
