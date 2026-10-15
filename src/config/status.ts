import type { OrderStatus } from "../store/game";

export const STATUS_LABEL: Record<OrderStatus, string> = {
  available: "Available",
  delivering: "Delivering",
  delivered: "Delivered",
};

export const STATUS_TONE: Record<OrderStatus, "cyan" | "amber" | "green"> = {
  available: "cyan",
  delivering: "amber",
  delivered: "green",
};

/** The full status sentence, e.g. "Dispatching shipper Alex". */
export const statusSentence = (status: OrderStatus, shipper?: string) => {
  if (status === "available") return "Waiting for a shipper";
  if (status === "delivering") return `Dispatching shipper ${shipper ?? ""}`.trim();
  return `Delivered by ${shipper ?? "a shipper"}`;
};
