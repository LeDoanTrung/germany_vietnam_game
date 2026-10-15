// Everything the client is likely to want to change lives in this file.
import { ROUTE } from "./route";

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
  /** Pick-up point: a gate of the host university. */
  from: Place;
  /** Drop-off point: the fixed destination of the ride. */
  to: Place;
  /** Gate where the shipper waits after taking the order. */
  gate: number;
  distanceKm: number;
  /** Shipping fee earned, in VND. */
  reward: number;
  note?: string;
};

export const GAME = {
  title: "PhD Workshop 2026",
  /** Text on the blue brush-stroke banner under the title. */
  banner: "Shipper Role-Play Game",
  subtitle: "KLU Saigon · 25–30 October 2026",
  appName: "Shipper App",
};

/**
 * One order per person in the group. Players pick an order themselves (or use
 * the random draw); once someone takes an order nobody else can.
 */
export const ORDER_COUNT = 12;

/** Every order starts at one of these gates of the host university. */
const GATES = [1, 2, 3];

// What's in each parcel. Dealt out in turn, so the list can be shorter than ORDER_COUNT.
const PARCELS: { item: string; quantity: number; reward: number; note?: string }[] = [
  { item: "Glass of beer", quantity: 1, reward: 25000, note: "Fragile — keep the glass upright." },
  { item: "Case of 24 beers", quantity: 2, reward: 42000 },
  { item: "Set of glasses", quantity: 6, reward: 30000, note: "Handle with care." },
  { item: "Crate of soft drinks", quantity: 1, reward: 18000 },
  { item: "Birthday cake", quantity: 1, reward: 22000, note: "Keep it level — do not stack." },
  { item: "Box of snacks", quantity: 3, reward: 20000 },
];

const destination: Place = { label: "B", name: ROUTE.destination.name, address: ROUTE.destination.address };

export const ORDERS: Order[] = Array.from({ length: ORDER_COUNT }, (_, index) => {
  const gate = GATES[index % GATES.length]!;
  return {
    ...PARCELS[index % PARCELS.length]!,
    id: `o${index + 1}`,
    number: index + 1,
    gate,
    from: { label: "A", name: `${ROUTE.start.name} · Gate ${gate}`, address: ROUTE.start.address },
    to: destination,
    distanceKm: Math.round(ROUTE.distanceMeters / 100) / 10,
  };
});

export const formatVnd = (amount: number) => `${amount.toLocaleString("en-US")} VND`;
