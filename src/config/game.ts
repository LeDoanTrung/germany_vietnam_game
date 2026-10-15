// Everything the client is likely to want to change lives in this file.
// There is no database: each name in PLAYERS gets exactly one order, so the
// order list always shows as many orders as there are people in the group.

export type Place = {
  /** Short label shown on the route, e.g. "A". */
  label: string;
  name: string;
  address: string;
};

export type Order = {
  id: string;
  /** Number shown to the player, e.g. "Đơn 1". */
  number: number;
  item: string;
  quantity: number;
  /** Pick-up point. */
  from: Place;
  /** Drop-off point. */
  to: Place;
  /** "C" — the person dispatched to collect this order. */
  shipper: string;
  distanceKm: number;
  /** Shipping fee earned, in VND. */
  reward: number;
  note?: string;
};

export const GAME = {
  // Placeholder — replace with the name the client picks.
  title: "Siêu Shipper",
  /** Text on the blue brush-stroke banner under the title. */
  banner: "Germany – Vietnam",
  subtitle: "Nhập vai shipper — giao hàng tận tay",
  appName: "Shipper App",
};

// Placeholder names — replace with the real list of people in the group.
// Add or remove names and the number of orders follows automatically.
export const PLAYERS: string[] = ["An", "Bình", "Chi", "Dũng", "Giang", "Hà", "Khoa", "Linh", "Minh", "Nam"];

type OrderTemplate = Omit<Order, "id" | "number" | "shipper">;

// Orders are dealt out from this pool in turn, so it can be shorter than the
// player list — the details just repeat.
const ORDER_POOL: OrderTemplate[] = [
  {
    item: "Ly bia",
    quantity: 1,
    from: { label: "A", name: "Quán Bia A", address: "12 Lê Lợi, Quận 1" },
    to: { label: "B", name: "Nhà khách B", address: "88 Nguyễn Trãi, Quận 5" },
    distanceKm: 4.2,
    reward: 25000,
    note: "Hàng dễ vỡ — giữ thẳng ly.",
  },
  {
    item: "Thùng bia 24 lon",
    quantity: 2,
    from: { label: "A", name: "Đại lý A", address: "301 Cách Mạng Tháng 8, Quận 3" },
    to: { label: "B", name: "Nhà hàng B", address: "19 Phan Xích Long, Phú Nhuận" },
    distanceKm: 6.8,
    reward: 42000,
  },
  {
    item: "Bộ cốc thủy tinh",
    quantity: 6,
    from: { label: "A", name: "Cửa hàng A", address: "56 Hai Bà Trưng, Quận 1" },
    to: { label: "B", name: "Căn hộ B", address: "2 Nguyễn Hữu Cảnh, Bình Thạnh" },
    distanceKm: 3.5,
    reward: 30000,
    note: "Gọi trước khi giao 10 phút.",
  },
  {
    item: "Két nước ngọt",
    quantity: 1,
    from: { label: "A", name: "Tạp hóa A", address: "77 Võ Văn Tần, Quận 3" },
    to: { label: "B", name: "Văn phòng B", address: "135 Nam Kỳ Khởi Nghĩa, Quận 3" },
    distanceKm: 2.1,
    reward: 18000,
  },
  {
    item: "Hộp bánh kem",
    quantity: 1,
    from: { label: "A", name: "Tiệm bánh A", address: "24 Pasteur, Quận 1" },
    to: { label: "B", name: "Nhà riêng B", address: "61 Trần Quang Khải, Quận 1" },
    distanceKm: 2.9,
    reward: 22000,
    note: "Giữ thăng bằng, không xếp chồng.",
  },
];

export const ORDERS: Order[] = PLAYERS.map((shipper, index) => ({
  ...ORDER_POOL[index % ORDER_POOL.length]!,
  id: `o${index + 1}`,
  number: index + 1,
  shipper,
}));

export const formatVnd = (amount: number) => `${amount.toLocaleString("vi-VN")}đ`;
