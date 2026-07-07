import { invoke } from "@tauri-apps/api/core";
import * as api from "../focusSessionApi";
import type { SessionDetail, SessionSummary } from "../types";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const invokeMock = vi.mocked(invoke);

function enableTauriRuntime() {
  Object.defineProperty(window, "__TAURI_INTERNALS__", {
    value: {},
    configurable: true,
  });
}

beforeEach(() => {
  enableTauriRuntime();
  invokeMock.mockReset();
});

test("exports a loader for persisted session details", () => {
  expect(api).toHaveProperty("loadSessionDetails");
});

test("loadSessionDetails invokes the tauri loader command", async () => {
  const loadSessionDetails = (api as { loadSessionDetails: () => Promise<SessionDetail[]> })
    .loadSessionDetails;
  const detail: SessionDetail = {
    session: {
      id: "session-1",
      mode: "focus",
      startedAt: "2026-07-07T09:00:00.000Z",
      endedAt: "2026-07-07T09:25:00.000Z",
      durationSeconds: 1500,
    },
    usage: [],
  };

  invokeMock.mockResolvedValueOnce([detail]);

  await expect(loadSessionDetails()).resolves.toEqual([detail]);
  expect(invokeMock).toHaveBeenCalledWith("load_session_details");
});

test("finishFocusSession sends the whole session payload and returns the saved detail", async () => {
  const finishFocusSession = api.finishFocusSession as unknown as (
    session: SessionSummary,
  ) => Promise<SessionDetail>;
  const session: SessionSummary = {
    id: "session-1",
    mode: "focus",
    startedAt: "2026-07-07T09:00:00.000Z",
    endedAt: "2026-07-07T09:25:00.000Z",
    durationSeconds: 1500,
  };
  const detail: SessionDetail = {
    session,
    usage: [],
  };

  invokeMock.mockResolvedValueOnce(detail);

  await expect(finishFocusSession(session)).resolves.toEqual(detail);
  expect(invokeMock).toHaveBeenCalledWith("finish_focus_session", { session });
});
