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

async function requestNotificationPermissionFromApi(): Promise<NotificationPermission | null> {
  const NotificationCtor = getNotificationCtor();

  if (NotificationCtor === null) {
    return null;
  }

  if (NotificationCtor.permission !== "default") {
    return NotificationCtor.permission;
  }

  return await NotificationCtor.requestPermission();
}

export async function requestNotificationPermission(): Promise<NotificationPermission | null> {
  try {
    return await requestNotificationPermissionFromApi();
  } catch {
    return null;
  }
}

export async function notifyTimerFinished(mode: TimerMode): Promise<void> {
  try {
    const permission = await requestNotificationPermission();

    if (permission !== "granted") {
      return;
    }

    const message = completionMessages[mode];
    const NotificationCtor = getNotificationCtor();

    if (NotificationCtor === null) {
      return;
    }

    new NotificationCtor(message.title, { body: message.body });
  } catch {
    return;
  }
}
