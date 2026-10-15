import type { LatLng } from "../config/route";

const EARTH_RADIUS_M = 6_371_000;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance between two points, in metres. */
export const distanceMeters = ([lat1, lng1]: LatLng, [lat2, lng2]: LatLng) => {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
};

/**
 * How far is left to ride along `path` from `position`: snap to the nearest
 * point of the route, then add up the rest of it. Good enough for a dense
 * street path; it doesn't try to detect riders who leave the route.
 */
export const remainingAlongPath = (path: LatLng[], position: LatLng) => {
  let nearest = 0;
  let nearestDistance = Infinity;
  path.forEach((point, index) => {
    const distance = distanceMeters(point, position);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = index;
    }
  });

  let remaining = nearestDistance;
  for (let index = nearest; index < path.length - 1; index++) {
    remaining += distanceMeters(path[index]!, path[index + 1]!);
  }
  return remaining;
};

/** Distance from `position` to the closest point of `path`, in metres. */
export const distanceToPath = (path: LatLng[], position: LatLng) =>
  path.reduce((closest, point) => Math.min(closest, distanceMeters(point, position)), Infinity);

export const formatDistance = (meters: number) =>
  meters < 1000 ? `${Math.round(meters / 10) * 10} m` : `${(meters / 1000).toFixed(1)} km`;
