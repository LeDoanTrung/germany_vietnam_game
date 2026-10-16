import { onBeforeUnmount, ref } from "vue";
import type { LatLng } from "../config/route";

export type GeoStatus = "idle" | "requesting" | "tracking" | "denied" | "unavailable";

// Live position from the phone's GPS. Nothing leaves the device.
//
// Shared by every component that asks for it (the order screen gates
// "Confirm delivered" on it; the live map draws it), so there is one GPS watch
// however many components are listening. It stops when the last one unmounts.

const position = ref<LatLng | null>(null);
/** Accuracy radius in metres, as reported by the phone. */
const accuracy = ref<number | null>(null);
const status = ref<GeoStatus>("idle");

let watchId: number | null = null;
let consumers = 0;

const start = () => {
  if (!("geolocation" in navigator)) {
    status.value = "unavailable";
    return;
  }
  if (watchId !== null) return;
  status.value = "requesting";

  watchId = navigator.geolocation.watchPosition(
    (result) => {
      position.value = [result.coords.latitude, result.coords.longitude];
      accuracy.value = result.coords.accuracy;
      status.value = "tracking";
    },
    (error) => {
      if (error.code === error.PERMISSION_DENIED) {
        status.value = "denied";
        // Drop the dead watch so "Try again" can start a fresh one once the
        // player has fixed the setting (otherwise only a reload would).
        clearWatch();
      }
      // A timeout mid-ride (tunnel, tall buildings) keeps the last known spot.
      else if (!position.value) status.value = "unavailable";
    },
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
  );
};

const clearWatch = () => {
  if (watchId !== null) navigator.geolocation.clearWatch(watchId);
  watchId = null;
};

/** "Try again" after the player turned location on in Settings. */
const retry = () => {
  clearWatch();
  start();
};

const stop = () => {
  clearWatch();
  // Forget the last fix: an old position must not count as "near the destination".
  position.value = null;
  accuracy.value = null;
  if (status.value === "tracking" || status.value === "requesting") status.value = "idle";
};

/**
 * Starts tracking without asking if the player already allowed location
 * before. Resolves to true when it started, false when the player still has
 * to be asked (or the browser can't tell).
 */
const resumeIfAllowed = async () => {
  try {
    const permission = await navigator.permissions?.query({ name: "geolocation" });
    if (permission?.state === "granted") {
      start();
      return true;
    }
  } catch {
    // Permissions API missing (older iOS): the player has to be asked.
  }
  return false;
};

export const useGeolocation = () => {
  consumers++;
  onBeforeUnmount(() => {
    consumers--;
    if (consumers === 0) stop();
  });

  return { position, accuracy, status, start, retry, resumeIfAllowed };
};
