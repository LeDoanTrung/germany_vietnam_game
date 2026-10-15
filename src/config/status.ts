import type { OrderStatus } from "../store/game";

export const STATUS_LABEL: Record<OrderStatus, string> = {
  dispatching: "Đang điều phối",
  delivering: "Đang giao hàng",
  delivered: "Đã giao hàng",
};

export const STATUS_TONE: Record<OrderStatus, "cyan" | "amber" | "green"> = {
  dispatching: "cyan",
  delivering: "amber",
  delivered: "green",
};

/** The full status sentence, e.g. "Đang điều phối shipper An". */
export const statusSentence = (status: OrderStatus, shipper: string) => {
  if (status === "dispatching") return `Đang điều phối shipper ${shipper}`;
  if (status === "delivering") return `${shipper} đang giao hàng`;
  return `${shipper} đã giao hàng thành công`;
};
