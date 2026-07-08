import type { TimerMode } from "./types";

const completionMessages: Record<TimerMode, { title: string; body: string }> = {
  focus: {
    title: "专注结束",
    body: "该休息了。",
  },
  shortBreak: {
    title: "短休息结束",
    body: "可以继续专注了。",
  },
  longBreak: {
    title: "长休息结束",
    body: "可以开始下一轮了。",
  },
};

function getNotificationCtor(): typeof Notification | null {
  if (typeof globalThis === "undefined" || !("Notification" in globalThis)) {
    return null;
  }

  return globalThis.Notification;
}

export async function notifyTimerFinished(mode: TimerMode): Promise<void> {
  const NotificationCtor = getNotificationCtor();

  if (NotificationCtor === null) {
    return;
  }

  try {
    let permission = NotificationCtor.permission;

    if (permission === "default") {
      permission = await NotificationCtor.requestPermission();
    }

    if (permission !== "granted") {
      return;
    }

    const message = completionMessages[mode];

    new NotificationCtor(message.title, { body: message.body });
  } catch {
    return;
  }
}
