import waypoints from "./route-waypoints.json";
import generated from "./route-path.json";

// The real ride for the GPS map: from the host university to the fixed
// destination. Edit route-waypoints.json and run `npm run route` to change it.

export type LatLng = [number, number];

export type RouteStop = {
  name: string;
  address: string;
  coords: LatLng;
};

export const ROUTE = {
  start: waypoints.start as RouteStop,
  destination: waypoints.destination as RouteStop,
  /** Street-following path, precomputed so the game never calls a routing API. */
  path: generated.path as LatLng[],
  distanceMeters: generated.distanceMeters,
};
