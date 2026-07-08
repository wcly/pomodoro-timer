import { notifyTimerFinished, requestNotificationPermission } from "../notification";

const originalNotification = globalThis.Notification;
const originalTauriInternals = (window as Window & { __TAURI_INTERNALS__?: unknown })
  .__TAURI_INTERNALS__;

function installNotification(
  permission: NotificationPermission,
  requestResult: NotificationPermission = permission,
) {
  const send = vi.fn();
  const requestPermissionMock = vi.fn(async () => requestResult);

  class NotificationMock {
    static permission: NotificationPermission = permission;
    static requestPermission = requestPermissionMock;

    constructor(title: string, options?: NotificationOptions) {
      send(title, options);
    }
  }

  Object.defineProperty(globalThis, "Notification", {
    value: NotificationMock,
    configurable: true,
    writable: true,
  });

  return { send, requestPermission: requestPermissionMock };
}

function installTauriRuntime() {
  Object.defineProperty(window, "__TAURI_INTERNALS__", {
    value: {},
    configurable: true,
    writable: true,
  });
}

afterEach(() => {
  if (originalNotification === undefined) {
    Reflect.deleteProperty(globalThis, "Notification");
  } else {
    Object.defineProperty(globalThis, "Notification", {
      value: originalNotification,
      configurable: true,
      writable: true,
    });
  }

  if (originalTauriInternals === undefined) {
    Reflect.deleteProperty(window, "__TAURI_INTERNALS__");
    return;
  }

  Object.defineProperty(window, "__TAURI_INTERNALS__", {
    value: originalTauriInternals,
    configurable: true,
    writable: true,
  });
});

test("sends a focus completion notification when permission is already granted", async () => {
  const { send, requestPermission } = installNotification("granted");

  await notifyTimerFinished("focus");

  expect(requestPermission).not.toHaveBeenCalled();
  expect(send).toHaveBeenCalledWith("专注结束", { body: "该休息了。" });
});

test("returns the current permission without prompting again", async () => {
  const { requestPermission } = installNotification("granted");

  await expect(requestNotificationPermission()).resolves.toBe("granted");
  expect(requestPermission).not.toHaveBeenCalled();
});

test("requests permission before sending a short-break notification", async () => {
  const { send, requestPermission } = installNotification("default", "granted");

  await notifyTimerFinished("shortBreak");

  expect(requestPermission).toHaveBeenCalledTimes(1);
  expect(send).toHaveBeenCalledWith("短休息结束", { body: "可以继续专注了。" });
});

test("requests permission when the browser has not decided yet", async () => {
  const { requestPermission } = installNotification("default", "granted");

  await expect(requestNotificationPermission()).resolves.toBe("granted");
  expect(requestPermission).toHaveBeenCalledTimes(1);
});

test("uses the guest Notification API in tauri runtimes", async () => {
  installTauriRuntime();
  const { send, requestPermission } = installNotification("granted");

  await notifyTimerFinished("shortBreak");

  expect(requestPermission).not.toHaveBeenCalled();
  expect(send).toHaveBeenCalledWith("短休息结束", { body: "可以继续专注了。" });
});

test("reads tauri permission from the guest Notification API when available", async () => {
  installTauriRuntime();
  const { requestPermission } = installNotification("granted");

  await expect(requestNotificationPermission()).resolves.toBe("granted");

  expect(requestPermission).not.toHaveBeenCalled();
});

test("does nothing when permission is denied", async () => {
  const { send, requestPermission } = installNotification("denied");

  await notifyTimerFinished("longBreak");

  expect(requestPermission).not.toHaveBeenCalled();
  expect(send).not.toHaveBeenCalled();
});

test("returns quietly when notifications are unavailable", async () => {
  Reflect.deleteProperty(globalThis, "Notification");

  await expect(notifyTimerFinished("focus")).resolves.toBeUndefined();
});

test("swallows notification constructor errors", async () => {
  class ThrowingNotification {
    static permission: NotificationPermission = "granted";
    static requestPermission = vi.fn(async () => "granted" as const);

    constructor() {
      throw new Error("boom");
    }
  }

  Object.defineProperty(globalThis, "Notification", {
    value: ThrowingNotification,
    configurable: true,
    writable: true,
  });

  await expect(notifyTimerFinished("focus")).resolves.toBeUndefined();
});
