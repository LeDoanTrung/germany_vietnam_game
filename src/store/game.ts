import { computed, reactive } from "vue";
import { ORDERS, type Order } from "../config/game";
import {
  RELEASE_WINDOW_MS,
  createClaimsBackend,
  type Claim,
  type ClaimsBackend,
  type GameSettings,
} from "../services/claims";

// Game state. Which orders are taken, and the organiser's codes, come from the
// claims backend (Firebase when configured, so every phone sees the same);
// everything else is per-device.

/**
 * available  — nobody has taken it yet
 * delivering — taken ("Dispatching shipper <name>"), on the way
 * delivered  — the shipper pressed "Confirm delivered"
 */
export type OrderStatus = "available" | "delivering" | "delivered";

export type ScreenName = "home" | "orders" | "order";

const NAME_KEY = "shipper-game:player-name";

const readName = () => {
  try {
    return localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
};

const state = reactive({
  screen: "home" as ScreenName,
  // Used by the screen transition to slide forwards or backwards.
  direction: "forward" as "forward" | "back",
  orderId: null as string | null,
  /** The congratulations pop-up over the order screen. */
  congratsOpen: false,
  /** START pressed this session: coming back home shows the notification straight away. */
  started: false,
  playerName: readName(),
  claims: {} as Record<string, Claim>,
  settings: { unlockCode: "", joinCode: "" } as GameSettings,
  backend: "connecting" as "connecting" | "online" | "local" | "error",
  /** The browser thinks there's no network at all. */
  offline: typeof navigator !== "undefined" && !navigator.onLine,
  /** A claim or release request is in flight. */
  busy: false,
  /** Short message shown in the snackbar, e.g. "Someone just took this order". */
  notice: "",
});

window.addEventListener("online", () => (state.offline = false));
window.addEventListener("offline", () => (state.offline = true));

let backend: ClaimsBackend | null = null;
let noticeTimer = 0;

const showNotice = (message: string, ms = 3500) => {
  state.notice = message;
  window.clearTimeout(noticeTimer);
  noticeTimer = window.setTimeout(() => (state.notice = ""), ms);
};

/** Connects to the claims backend once, at startup. Safe to call again to retry. */
export const connectClaims = async () => {
  if (backend) return;
  state.backend = "connecting";
  try {
    backend = await createClaimsBackend();
    backend.subscribe((claims) => (state.claims = claims));
    backend.subscribeSettings((settings) => (state.settings = settings));
    state.backend = backend.mode;
  } catch (error) {
    console.error("Could not connect to the order service.", error);
    backend = null;
    state.backend = "error";
  }
};

const SCREEN_ORDER: ScreenName[] = ["home", "orders", "order"];

const go = (screen: ScreenName, orderId: string | null = state.orderId) => {
  state.direction = SCREEN_ORDER.indexOf(screen) >= SCREEN_ORDER.indexOf(state.screen) ? "forward" : "back";
  state.orderId = orderId;
  state.congratsOpen = false;
  state.screen = screen;
};

export const statusOf = (id: string): OrderStatus => state.claims[id]?.status ?? "available";
export const claimOf = (id: string): Claim | undefined => state.claims[id];

const normaliseName = (name: string) => name.trim().toLocaleLowerCase();

/** Removes per-order data kept on this phone (ridden trail, organiser unlock). */
const forgetOrderLocally = (orderId: string) => {
  try {
    localStorage.removeItem(`shipper-game:trail:${orderId}`);
    localStorage.removeItem(`shipper-game:unlocked:${orderId}`);
  } catch {
    // Nothing to clean up.
  }
};

export const useGame = () => {
  const currentOrder = computed<Order | null>(() => ORDERS.find((order) => order.id === state.orderId) ?? null);
  const availableOrders = computed(() => ORDERS.filter((order) => statusOf(order.id) === "available"));
  const deliveredOrders = computed(() => ORDERS.filter((order) => statusOf(order.id) === "delivered"));
  /** The order this player took, if any. */
  const myOrder = computed(() => ORDERS.find((order) => state.claims[order.id]?.mine) ?? null);
  const earnings = computed(() =>
    myOrder.value && statusOf(myOrder.value.id) === "delivered" ? myOrder.value.reward : 0,
  );

  /** Another player already took an order under this name. */
  const nameInUse = (name: string) =>
    Object.values(state.claims).some((claim) => !claim.mine && normaliseName(claim.shipper) === normaliseName(name));

  /** The organiser has switched on a join code. */
  const joinCodeRequired = computed(() => state.settings.joinCode.trim().length > 0);
  const joinCodeMatches = (code: string) =>
    !joinCodeRequired.value || code.trim().toUpperCase() === state.settings.joinCode.trim().toUpperCase();

  const start = (name: string) => {
    state.playerName = name.trim().slice(0, 24);
    try {
      localStorage.setItem(NAME_KEY, state.playerName);
    } catch {
      // Not persisted; the player can type it again next time.
    }
    state.started = true;
  };

  /**
   * "Edit name" — fixes a typo, before or after taking an order. Once an order
   * is taken the new name is written to it too, so every phone and the
   * organiser page see it. Resolves to false if that couldn't be saved.
   */
  const renamePlayer = async (name: string) => {
    const next = name.trim().slice(0, 24);
    if (!next) return false;

    const order = myOrder.value;
    if (order && backend) {
      try {
        await backend.rename(order.id, next);
      } catch (error) {
        const code = (error as { code?: string }).code;
        showNotice(
          code === "permission-denied"
            ? "Couldn't change the name on your order — ask the organiser."
            : "No connection — check your internet and try again.",
        );
        return false;
      }
    }

    state.playerName = next;
    try {
      localStorage.setItem(NAME_KEY, next);
    } catch {
      // Not persisted; harmless.
    }
    showNotice(`Name changed to ${next}.`);
    return true;
  };

  const openOrder = (id: string) => go("order", id);

  /** "Accept order" */
  const acceptOrder = async () => {
    const orderId = state.orderId;
    if (!orderId || !backend || state.busy) return;
    state.busy = true;
    try {
      const result = await backend.claim(orderId, state.playerName || "Shipper");
      if (result.ok) return;
      if (result.reason === "taken") showNotice("Too late — someone just took this order.");
      else if (result.reason === "already-has-order") showNotice("You already have an order.");
      else showNotice("No connection — check your internet and try again.");
    } finally {
      state.busy = false;
    }
  };

  /**
   * "Confirm delivered". Shown as done straight away: Firestore keeps the
   * write and sends it once the phone is back online (waiting for the server
   * here used to leave the button stuck with no message when offline).
   */
  const confirmDelivered = () => {
    const orderId = state.orderId;
    if (!orderId || !backend) return;
    const write = backend.deliver(orderId);
    state.congratsOpen = true;

    let synced = false;
    write.then(
      () => (synced = true),
      () => {
        synced = true;
        state.congratsOpen = false;
        showNotice("Couldn't confirm this delivery — please try again.");
      },
    );
    // Still not on the server after a few seconds: tell the player it's queued, not lost.
    window.setTimeout(() => {
      if (!synced && state.backend === "online") {
        showNotice("Saved on your phone — it will be sent when you're back online.", 6000);
      }
    }, 5000);
  };

  /** The player can still give this order back. */
  const canRelease = (orderId: string, now = Date.now()) => {
    const claim = state.claims[orderId];
    return !!claim?.mine && claim.status === "delivering" && now - claim.claimedAt < RELEASE_WINDOW_MS;
  };

  /** "Picked the wrong order" — give it back so someone else (or this player) can take it. */
  const releaseOrder = async () => {
    const orderId = state.orderId;
    if (!orderId || !backend || state.busy) return;
    state.busy = true;
    try {
      await backend.release(orderId);
      forgetOrderLocally(orderId);
      showNotice("Order released — pick another one.");
      go("orders", null);
    } catch (error) {
      const code = (error as { code?: string }).code;
      showNotice(
        code === "permission-denied"
          ? "It's too late to release this order — ask the organiser."
          : "No connection — check your internet and try again.",
      );
    } finally {
      state.busy = false;
    }
  };

  const closeCongrats = () => {
    state.congratsOpen = false;
  };

  const back = () => {
    if (state.screen === "orders") return go("home", null);
    go("orders", null);
  };

  /** Local mode only: online rounds are reset by the organiser. */
  const canReset = computed(() => state.backend === "local");
  const resetRound = () => {
    ORDERS.forEach((order) => forgetOrderLocally(order.id));
    backend?.reset?.();
    state.started = false;
    go("home", null);
  };

  return {
    state,
    currentOrder,
    availableOrders,
    deliveredOrders,
    myOrder,
    earnings,
    go,
    back,
    start,
    renamePlayer,
    nameInUse,
    joinCodeRequired,
    joinCodeMatches,
    openOrder,
    acceptOrder,
    confirmDelivered,
    canRelease,
    releaseOrder,
    closeCongrats,
    canReset,
    resetRound,
    showNotice,
  };
};
