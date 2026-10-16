// What kind of phone/browser the player is on, for platform-specific help.

const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";

/**
 * Browsers built into chat and social apps. Links in this game are shared in
 * Messenger and Zalo, and these views often block location or lose state.
 */
export const isInAppBrowser = /FBAN|FBAV|FB_IAB|FBIOS|Messenger|Instagram|Zalo|Line\/|MicroMessenger|TikTok|Snapchat/i.test(ua);

export const isIOS = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && typeof document !== "undefined" && "ontouchend" in document);

export const isAndroid = /Android/i.test(ua);

/**
 * On iPhone, every browser that isn't Safari (Chrome, Firefox, Edge…) needs
 * location allowed for that app in iOS Settings, which is where players get stuck.
 */
export const iosBrowserApp: string | null = !isIOS
  ? null
  : /CriOS/.test(ua)
    ? "Chrome"
    : /FxiOS/.test(ua)
      ? "Firefox"
      : /EdgiOS/.test(ua)
        ? "Edge"
        : /OPiOS|OPT\//.test(ua)
          ? "Opera"
          : null;
