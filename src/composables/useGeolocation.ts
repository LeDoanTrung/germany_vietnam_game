import { onBeforeUnmount, ref } from "vue";
import type { LatLng } from "../config/route";

export type GeoStatus = "idle" | "requesting" | "tracking" | "denied" | "unavailable";

// Live position from the phone's GPS. Nothing leaves the device.
export const useGeolocation = () => {
  const position = ref<LatLng | null>(null);
  /** Accuracy radius in metres, as reported by the phone. */
  const accuracy = ref<number | null>(null);
  const status = ref<GeoStatus>("idle");
  let watchId: number | null = null;

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
        if (error.code === error.PERMISSION_DENIED) status.value = "denied";
        // A timeout mid-ride (tunnel, tall buildings) keeps the last known spot.
        else if (!position.value) status.value = "unavailable";
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );
  };

  const stop = () => {
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    watchId = null;
  };

  onBeforeUnmount(stop);

  return { position, accuracy, status, start, stop };
};
