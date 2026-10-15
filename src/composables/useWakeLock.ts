import { onBeforeUnmount } from "vue";

// Keeps the screen on while the live map is open. Phones pause GPS updates
// for a web page once the screen locks, so this keeps the dot moving.
// Supported on Android Chrome and iOS 16.4+; silently does nothing elsewhere.
export const useWakeLock = () => {
  let sentinel: WakeLockSentinel | null = null;
  let wanted = false;

  const acquire = async () => {
    if (!("wakeLock" in navigator) || document.visibilityState !== "visible") return;
    try {
      sentinel = await navigator.wakeLock.request("screen");
    } catch {
      // Denied (e.g. battery saver) — the game still works.
    }
  };

  // The browser drops the lock when the tab is hidden; take it back on return.
  const handleVisibility = () => {
    if (wanted && document.visibilityState === "visible") void acquire();
  };

  const request = () => {
    wanted = true;
    document.addEventListener("visibilitychange", handleVisibility);
    void acquire();
  };

  const release = () => {
    wanted = false;
    document.removeEventListener("visibilitychange", handleVisibility);
    void sentinel?.release();
    sentinel = null;
  };

  onBeforeUnmount(release);

  return { request, release };
};
