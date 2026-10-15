<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ROUTE, type LatLng } from "../config/route";
import { useGeolocation } from "../composables/useGeolocation";
import { useWakeLock } from "../composables/useWakeLock";
import { formatDistance, remainingAlongPath, distanceMeters } from "../utils/geo";
import { sounds } from "../composables/useSound";

// Real map of the ride, with the player's live GPS position. GPS is "just for
// fun" (client decision): it never blocks the game, and if location is denied
// the route still shows.
//
// Map data © OpenStreetMap contributors. Tiles come straight from OSM, which is
// fine for a group this size; the route itself is precomputed (no API calls).

const props = defineProps<{ gate: number }>();

/** Within this distance of the destination counts as "arrived". */
const ARRIVED_RADIUS_M = 60;

const mapRef = ref<HTMLElement | null>(null);
const { position, accuracy, status, start: startGps } = useGeolocation();
const { request: keepScreenOn } = useWakeLock();

/** Keep the map centred on the rider until they pan it themselves. */
const following = ref(true);

let map: L.Map | null = null;
let riderMarker: L.Marker | null = null;
let accuracyCircle: L.Circle | null = null;

const pin = (className: string, html: string) =>
  L.divIcon({ className: `live-map-pin ${className}`, html, iconSize: [36, 36], iconAnchor: [18, 18] });

onMounted(() => {
  if (!mapRef.value) return;

  map = L.map(mapRef.value, { zoomControl: false, scrollWheelZoom: false, attributionControl: true });
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);
  L.control.zoom({ position: "bottomright" }).addTo(map);

  // Route: a soft wide glow under a crisp line.
  L.polyline(ROUTE.path, { color: "#ffb020", weight: 10, opacity: 0.22, lineCap: "round" }).addTo(map);
  L.polyline(ROUTE.path, { color: "#ffb020", weight: 4, opacity: 0.95, lineCap: "round", dashArray: "1 9" }).addTo(map);

  L.marker(ROUTE.start.coords, { icon: pin("live-map-pin-start", "A"), keyboard: false })
    .bindTooltip(`Start · Gate ${props.gate}`, { direction: "top", offset: [0, -16] })
    .addTo(map);
  L.marker(ROUTE.destination.coords, { icon: pin("live-map-pin-end", "🏁"), keyboard: false })
    .bindTooltip(ROUTE.destination.name, { direction: "top", offset: [0, -16], permanent: true })
    .addTo(map);

  map.fitBounds(L.latLngBounds(ROUTE.path), { padding: [28, 28] });
  // A drag means the player wants to look around: stop auto-centring.
  map.on("dragstart", () => (following.value = false));
});

onBeforeUnmount(() => {
  map?.remove();
  map = null;
});

watch(position, (next) => {
  if (!map || !next) return;
  if (!riderMarker) {
    riderMarker = L.marker(next, { icon: pin("live-map-pin-rider", "🛵"), zIndexOffset: 1000, keyboard: false }).addTo(map);
    accuracyCircle = L.circle(next, { radius: accuracy.value ?? 0, color: "#34bfff", weight: 1, fillOpacity: 0.12 }).addTo(map);
  } else {
    riderMarker.setLatLng(next);
    accuracyCircle?.setLatLng(next).setRadius(accuracy.value ?? 0);
  }
  // Zoom 16 shows a couple of blocks around the rider: close enough to read
  // street names, far enough to see the next turn.
  if (following.value) map.setView(next, 16, { animate: true });
});

const remaining = computed(() => (position.value ? remainingAlongPath(ROUTE.path, position.value) : null));
const arrived = computed(
  () => !!position.value && distanceMeters(position.value, ROUTE.destination.coords as LatLng) <= ARRIVED_RADIUS_M,
);

watch(arrived, (now, before) => {
  if (now && !before) sounds.success();
});

const handleLocate = () => {
  sounds.tap();
  startGps();
  keepScreenOn();
};

const recenter = () => {
  sounds.tap();
  following.value = true;
  if (map && position.value) map.setView(position.value, 16, { animate: true });
  else if (map) map.fitBounds(L.latLngBounds(ROUTE.path), { padding: [28, 28] });
};
</script>

<template>
  <figure class="live-map">
    <div ref="mapRef" class="live-map-canvas" role="region" :aria-label="`Map of the route to ${ROUTE.destination.name}`"></div>

    <!-- Ask first, with a reason, rather than firing the browser prompt cold. -->
    <div v-if="status === 'idle'" class="live-map-overlay">
      <p class="live-map-overlay-title">See yourself on the map</p>
      <p class="live-map-overlay-copy">Your location stays on your phone — it's never sent anywhere.</p>
      <button type="button" class="live-map-locate" @click="handleLocate">📍 Show my location</button>
    </div>

    <button
      v-if="status === 'tracking' && !following"
      type="button"
      class="live-map-recenter"
      aria-label="Centre the map on me"
      @click="recenter"
    >
      ◎
    </button>

    <figcaption class="live-map-info">
      <template v-if="arrived">
        <span class="live-map-info-main live-map-info-arrived">You've arrived! 🎉</span>
        <span class="live-map-info-sub">Confirm the delivery below.</span>
      </template>
      <template v-else-if="status === 'tracking' && remaining !== null">
        <span class="live-map-info-main">{{ formatDistance(remaining) }} to go</span>
        <span class="live-map-info-sub">to {{ ROUTE.destination.name }}</span>
      </template>
      <template v-else-if="status === 'requesting'">
        <span class="live-map-info-main">Finding you…</span>
        <span class="live-map-info-sub">Allow location access when your phone asks.</span>
      </template>
      <template v-else-if="status === 'denied'">
        <span class="live-map-info-main">Location is off</span>
        <span class="live-map-info-sub">The route still works — turn location on in your browser settings to see yourself.</span>
      </template>
      <template v-else-if="status === 'unavailable'">
        <span class="live-map-info-main">No GPS signal</span>
        <span class="live-map-info-sub">Just follow the route — the game works without it.</span>
      </template>
      <template v-else>
        <span class="live-map-info-main">{{ formatDistance(ROUTE.distanceMeters) }} ride</span>
        <span class="live-map-info-sub">to {{ ROUTE.destination.name }}</span>
      </template>
    </figcaption>

    <p class="live-map-safety">🛵 Ride safely — don't use your phone while driving.</p>
  </figure>
</template>

<style scoped lang="scss">
.live-map {
  position: relative;
  margin: 0;
  border-radius: var(--radius-md);
  border: 1px solid rgba(52, 191, 255, 0.35);
  background: rgba(2, 10, 28, 0.6);
  overflow: hidden;

  &-canvas {
    height: 300px;
    background: #0b1730;
    z-index: 0;

    // Dark tiles to match the hologram UI: invert the standard OSM style,
    // then rotate the hues back so water stays blue and parks green.
    :deep(.leaflet-tile-pane) {
      filter: invert(1) hue-rotate(180deg) brightness(0.95) saturate(0.6) contrast(0.9);
    }

    :deep(.leaflet-control-attribution) {
      background: rgba(2, 10, 28, 0.7);
      color: var(--color-text-300);
      font-size: 10px;

      a {
        color: var(--color-cyan-300);
      }
    }

    :deep(.leaflet-bar a) {
      background: rgba(10, 30, 66, 0.92);
      border-color: rgba(52, 191, 255, 0.4);
      color: var(--color-cyan-100);
    }

    :deep(.leaflet-tooltip) {
      background: rgba(10, 30, 66, 0.95);
      border: 1px solid var(--color-amber-400);
      color: var(--color-text-100);
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 12px;
      box-shadow: none;

      &::before {
        display: none;
      }
    }

    :deep(.live-map-pin) {
      display: grid;
      place-items: center;
      border-radius: 50%;
      font-family: var(--font-mono);
      font-weight: 700;
      font-size: 15px;
    }

    :deep(.live-map-pin-start) {
      background: var(--color-bg-800);
      border: 2px solid var(--color-cyan-400);
      color: var(--color-cyan-100);
    }

    :deep(.live-map-pin-end) {
      background: var(--color-bg-800);
      border: 2px solid var(--color-amber-400);
      box-shadow: 0 0 14px rgba(255, 176, 32, 0.7);
      font-size: 17px;
    }

    // The rider: a scooter on a glowing, pulsing disc.
    :deep(.live-map-pin-rider) {
      background: var(--color-cyan-400);
      border: 3px solid #fff;
      font-size: 17px;
      animation: live-map-pulse 1.6s ease-out infinite;
    }
  }

  &-overlay {
    position: absolute;
    inset: 0 0 auto;
    height: 300px;
    z-index: 500;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-xs);
    padding: var(--space-md);
    background: rgba(2, 10, 28, 0.62);
    text-align: center;

    &-title {
      font-size: 18px;
      font-weight: 900;
    }

    &-copy {
      max-width: 260px;
      font-size: 13px;
      color: var(--color-text-300);
    }
  }

  &-locate {
    margin-top: var(--space-xs);
    min-height: 46px;
    padding: 10px 20px;
    border: none;
    border-radius: var(--radius-pill);
    background: var(--color-cyan-400);
    color: #001a2e;
    font-weight: 900;
    font-size: 15px;
    cursor: pointer;
    box-shadow: 0 0 22px rgba(52, 191, 255, 0.5);

    &:active {
      transform: scale(0.97);
    }
  }

  &-recenter {
    position: absolute;
    top: 12px;
    right: 12px;
    z-index: 500;
    width: 44px;
    height: 44px;
    border: 1px solid rgba(52, 191, 255, 0.5);
    border-radius: 50%;
    background: rgba(10, 30, 66, 0.92);
    color: var(--color-cyan-100);
    font-size: 22px;
    cursor: pointer;
  }

  &-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: var(--space-sm) var(--space-md);
    border-top: 1px solid rgba(52, 191, 255, 0.2);

    &-main {
      font-size: 17px;
      font-weight: 900;
      color: var(--color-amber-300);
    }

    &-arrived {
      color: var(--color-green-400);
    }

    &-sub {
      font-size: 13px;
      color: var(--color-text-300);
    }
  }

  &-safety {
    padding: 8px var(--space-md);
    background: rgba(255, 176, 32, 0.1);
    border-top: 1px solid rgba(255, 176, 32, 0.25);
    font-size: 12px;
    font-weight: 700;
    color: var(--color-amber-300);
  }
}

@keyframes live-map-pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(52, 191, 255, 0.7);
  }
  100% {
    box-shadow: 0 0 0 16px rgba(52, 191, 255, 0);
  }
}
</style>
