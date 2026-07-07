import { invoke } from "@tauri-apps/api/core";
import type { SessionUsageRow } from "./types";

function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function startFocusSession(sessionId: string): Promise<void> {
  if (!isTauriRuntime()) {
    return;
  }

  await invoke("start_focus_session", { sessionId });
}

export async function pauseFocusSession(): Promise<void> {
  if (!isTauriRuntime()) {
    return;
  }

  await invoke("pause_focus_session");
}

export async function resumeFocusSession(): Promise<void> {
  if (!isTauriRuntime()) {
    return;
  }

  await invoke("resume_focus_session");
}

export async function resetFocusSession(): Promise<void> {
  if (!isTauriRuntime()) {
    return;
  }

  await invoke("reset_focus_session");
}

export async function captureFocusSample(): Promise<void> {
  if (!isTauriRuntime()) {
    return;
  }

  await invoke("capture_focus_sample");
}

export async function finishFocusSession(
  sessionId: string,
  durationSeconds: number,
): Promise<SessionUsageRow[]> {
  if (!isTauriRuntime()) {
    return [];
  }

  return invoke<SessionUsageRow[]>("finish_focus_session", {
    sessionId,
    durationSeconds,
  });
}
