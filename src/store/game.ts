import { computed, reactive } from "vue";
import { ORDERS, type Order } from "../config/game";
import { createClaimsBackend, type Claim, type ClaimsBackend } from "../services/claims";

// Game state. Which orders are taken comes from the claims backend (Firebase
// when configured, so every phone sees the same list); everything else is
// per-device.

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
  backend: "connecting" as "connecting" | "online" | "local" | "error",
  /** A claim or delivery request is in flight. */
  busy: false,
  /** Short message shown in the snackbar, e.g. "Someone just took this order". */
  notice: "",
});

let backend: ClaimsBackend | null = null;
let noticeTimer = 0;

const showNotice = (message: string) => {
  state.notice = message;
  window.clearTimeout(noticeTimer);
  noticeTimer = window.setTimeout(() => (state.notice = ""), 3500);
};

/** Connects to the claims backend once, at startup. Safe to call again to retry. */
export const connectClaims = async () => {
  if (backend) return;
  state.backend = "connecting";
  try {
    backend = await createClaimsBackend();
    backend.subscribe((claims) => (state.claims = claims));
    state.backend = backend.mode;
  } catch (error) {
    console.error("Could not connect to the order service.", error);
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

export const useGame = () => {
  const currentOrder = computed<Order | null>(() => ORDERS.find((order) => order.id === state.orderId) ?? null);
  const availableOrders = computed(() => ORDERS.filter((order) => statusOf(order.id) === "available"));
  const deliveredOrders = computed(() => ORDERS.filter((order) => statusOf(order.id) === "delivered"));
  /** The order this player took, if any. */
  const myOrder = computed(() => ORDERS.find((order) => state.claims[order.id]?.mine) ?? null);
  const earnings = computed(() =>
    myOrder.value && statusOf(myOrder.value.id) === "delivered" ? myOrder.value.reward : 0,
  );

  const start = (name: string) => {
    state.playerName = name.trim().slice(0, 24);
    try {
      localStorage.setItem(NAME_KEY, state.playerName);
    } catch {
      // Not persisted; the player can type it again next time.
    }
    state.started = true;
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

  /** "Confirm delivered" */
  const confirmDelivered = async () => {
    const orderId = state.orderId;
    if (!orderId || !backend || state.busy) return;
    state.busy = true;
    try {
      await backend.deliver(orderId);
      state.congratsOpen = true;
    } catch {
      showNotice("No connection — check your internet and try again.");
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

  /** Local mode only: online rounds are reset by the organiser in Firebase. */
  const canReset = computed(() => state.backend === "local");
  const resetRound = () => {
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
    openOrder,
    acceptOrder,
    confirmDelivered,
    closeCongrats,
    canReset,
    resetRound,
    showNotice,
  };
};
