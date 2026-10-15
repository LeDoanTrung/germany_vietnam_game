import { computed, reactive, watch } from "vue";
import { ORDERS, type Order } from "../config/game";

// The whole game runs in the browser. Progress is kept in localStorage so a
// reload doesn't wipe the round — no server, no API calls.

/**
 * dispatching — "Dispatching shipper <name>" (every order starts here)
 * delivering  — the shipper pressed "Accept order"
 * delivered   — the shipper pressed "Confirm delivered"
 */
export type OrderStatus = "dispatching" | "delivering" | "delivered";

export type ScreenName = "home" | "orders" | "order";

const STORAGE_KEY = "shipper-game:progress:v3";

const loadStatuses = (): Record<string, OrderStatus> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Record<string, OrderStatus>;
  } catch {
    // Private mode or blocked storage — start fresh.
  }
  return {};
};

const state = reactive({
  screen: "home" as ScreenName,
  // Used by the screen transition to slide forwards or backwards.
  direction: "forward" as "forward" | "back",
  orderId: null as string | null,
  statuses: loadStatuses(),
  /** The congratulations pop-up over the order screen. */
  congratsOpen: false,
  /** Start has been pressed this session; coming back home skips straight to the bell. */
  started: false,
});

watch(
  () => state.statuses,
  (statuses) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(statuses));
    } catch {
      // Ignore — progress just won't survive a reload.
    }
  },
  { deep: true },
);

const SCREEN_ORDER: ScreenName[] = ["home", "orders", "order"];

const go = (screen: ScreenName, orderId: string | null = state.orderId) => {
  state.direction = SCREEN_ORDER.indexOf(screen) >= SCREEN_ORDER.indexOf(state.screen) ? "forward" : "back";
  state.orderId = orderId;
  state.congratsOpen = false;
  state.screen = screen;
};

export const statusOf = (id: string): OrderStatus => state.statuses[id] ?? "dispatching";

export const useGame = () => {
  const currentOrder = computed<Order | null>(() => ORDERS.find((order) => order.id === state.orderId) ?? null);
  const pendingOrders = computed(() => ORDERS.filter((order) => statusOf(order.id) !== "delivered"));
  const deliveredOrders = computed(() => ORDERS.filter((order) => statusOf(order.id) === "delivered"));
  const earnings = computed(() => deliveredOrders.value.reduce((sum, order) => sum + order.reward, 0));

  const openOrder = (id: string) => go("order", id);

  /** "Accept order" */
  const acceptOrder = () => {
    if (!state.orderId) return;
    state.statuses[state.orderId] = "delivering";
  };

  /** "Confirm delivered" */
  const confirmDelivered = () => {
    if (!state.orderId) return;
    state.statuses[state.orderId] = "delivered";
    state.congratsOpen = true;
  };

  const closeCongrats = () => {
    state.congratsOpen = false;
  };

  const back = () => {
    if (state.screen === "orders") return go("home", null);
    go("orders", null);
  };

  const start = () => {
    state.started = true;
  };

  const resetRound = () => {
    state.statuses = {};
    state.started = false;
    go("home", null);
  };

  return {
    state,
    currentOrder,
    pendingOrders,
    deliveredOrders,
    earnings,
    go,
    back,
    openOrder,
    acceptOrder,
    confirmDelivered,
    closeCongrats,
    start,
    resetRound,
  };
};
