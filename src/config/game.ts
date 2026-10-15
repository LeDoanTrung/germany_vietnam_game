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
  /** Number shown to the player, e.g. "Order 1". */
  number: number;
  item: string;
  quantity: number;
  /** Pick-up point. */
  from: Place;
  /** Drop-off point. */
  to: Place;
  /** The player dispatched to deliver this order. */
  shipper: string;
  distanceKm: number;
  /** Shipping fee earned, in VND. */
  reward: number;
  note?: string;
};

export const GAME = {
  // Placeholder — replace with the name the client picks.
  title: "Super Shipper",
  /** Text on the blue brush-stroke banner under the title. */
  banner: "Germany – Vietnam",
  subtitle: "Play the shipper — deliver every order!",
  appName: "Shipper App",
};

// Placeholder names — replace with the real list of people in the group.
// Add or remove names and the number of orders follows automatically.
export const PLAYERS: string[] = ["Alex", "Ben", "Chloe", "Daniel", "Emma", "Felix", "Grace", "Hannah", "Ian", "Julia"];

type OrderTemplate = Omit<Order, "id" | "number" | "shipper">;

// Orders are dealt out from this pool in turn, so it can be shorter than the
// player list — the details just repeat.
const ORDER_POOL: OrderTemplate[] = [
  {
    item: "Glass of beer",
    quantity: 1,
    from: { label: "A", name: "Beer Bar A", address: "12 Harbor Street, District 1" },
    to: { label: "B", name: "Guest House B", address: "88 River Road, District 5" },
    distanceKm: 4.2,
    reward: 25000,
    note: "Fragile — keep the glass upright.",
  },
  {
    item: "Case of 24 beers",
    quantity: 2,
    from: { label: "A", name: "Wholesaler A", address: "301 Market Avenue, District 3" },
    to: { label: "B", name: "Restaurant B", address: "19 Garden Street, District 7" },
    distanceKm: 6.8,
    reward: 42000,
  },
  {
    item: "Set of glasses",
    quantity: 6,
    from: { label: "A", name: "Shop A", address: "56 Park Lane, District 1" },
    to: { label: "B", name: "Apartment B", address: "2 Riverside Drive, District 2" },
    distanceKm: 3.5,
    reward: 30000,
    note: "Call 10 minutes before delivery.",
  },
  {
    item: "Crate of soft drinks",
    quantity: 1,
    from: { label: "A", name: "Grocery A", address: "77 Station Road, District 3" },
    to: { label: "B", name: "Office B", address: "135 Central Avenue, District 3" },
    distanceKm: 2.1,
    reward: 18000,
  },
  {
    item: "Birthday cake",
    quantity: 1,
    from: { label: "A", name: "Bakery A", address: "24 Baker Street, District 1" },
    to: { label: "B", name: "Home B", address: "61 Ocean Boulevard, District 1" },
    distanceKm: 2.9,
    reward: 22000,
    note: "Keep it level — do not stack.",
  },
];

export const ORDERS: Order[] = PLAYERS.map((shipper, index) => ({
  ...ORDER_POOL[index % ORDER_POOL.length]!,
  id: `o${index + 1}`,
  number: index + 1,
  shipper,
}));

export const formatVnd = (amount: number) => `${amount.toLocaleString("en-US")} VND`;
