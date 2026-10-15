import type { OrderStatus } from "../store/game";

export const STATUS_LABEL: Record<OrderStatus, string> = {
  dispatching: "Dispatching",
  delivering: "Delivering",
  delivered: "Delivered",
};

export const STATUS_TONE: Record<OrderStatus, "cyan" | "amber" | "green"> = {
  dispatching: "cyan",
  delivering: "amber",
  delivered: "green",
};

/** The full status sentence, e.g. "Dispatching shipper Alex". */
export const statusSentence = (status: OrderStatus, shipper: string) => {
  if (status === "dispatching") return `Dispatching shipper ${shipper}`;
  if (status === "delivering") return `${shipper} is delivering`;
  return `${shipper} delivered successfully`;
};
