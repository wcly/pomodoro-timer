import { invoke } from "@tauri-apps/api/core";
import type { SessionUsageRow } from "./types";

function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T | null> {
  if (!isTauriRuntime()) {
    return null;
  }
  return invoke<T>(cmd, args);
}

export async function startFocusSession(sessionId: string): Promise<void> {
  await tauriInvoke("start_focus_session", { sessionId });
}

export async function pauseFocusSession(): Promise<void> {
  await tauriInvoke("pause_focus_session");
}

export async function resumeFocusSession(): Promise<void> {
  await tauriInvoke("resume_focus_session");
}

export async function resetFocusSession(): Promise<void> {
  await tauriInvoke("reset_focus_session");
}

export async function captureFocusSample(): Promise<void> {
  await tauriInvoke("capture_focus_sample");
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
