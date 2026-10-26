<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ROUTE, type LatLng } from "../config/route";
import { useGeolocation } from "../composables/useGeolocation";
import { useWakeLock } from "../composables/useWakeLock";
import { formatDistance, remainingAlongPath, distanceMeters, distanceToPath, isWithinDelivery } from "../utils/geo";
import { DELIVERY } from "../config/game";
import { sounds } from "../composables/useSound";

// Real map of the ride, with the player's live GPS position. The order screen
// uses the same position to unlock "Confirm delivered" near the destination;
// this component only draws it.
//
// The tour operator decides the actual route on the day, so the planned route
// is only a faint suggestion: the line that matters is the trail of where the
// rider has really been, drawn from GPS as they go (client: "if they take a
// different route, the map changes too").
//
// Map data © OpenStreetMap contributors. Tiles come straight from OSM, which is
// fine for a group this size; no routing API is called.

const props = defineProps<{
  gate: number;
  /** Exact spot of the player's gate, when the organiser has provided it. */
  gateCoords: LatLng | null;
  orderId: string;
}>();

/** Further than this from the planned route counts as a different route. */
const OFF_ROUTE_M = 80;
/** Ignore fixes worse than this — indoors or between tall buildings GPS jumps around. */
const MAX_ACCURACY_M = 50;
/** Only extend the trail once the rider has moved this far, to skip standing-still jitter. */
const MIN_STEP_M = 8;

// The trail is kept per order, so a reload mid-ride doesn't wipe it.
const trailKey = `shipper-game:trail:${props.orderId}`;
const loadTrail = (): LatLng[] => {
  try {
    return JSON.parse(localStorage.getItem(trailKey) ?? "[]") as LatLng[];
  } catch {
    return [];
  }
};
const trail: LatLng[] = loadTrail();
const saveTrail = () => {
  try {
    localStorage.setItem(trailKey, JSON.stringify(trail));
  } catch {
    // Storage full or blocked — the trail just won't survive a reload.
  }
};

const mapRef = ref<HTMLElement | null>(null);
const { position, accuracy, status, start: startGps } = useGeolocation();
const { request: keepScreenOn } = useWakeLock();

/** Keep the map centred on the rider until they pan it themselves. */
const following = ref(true);

let map: L.Map | null = null;
let riderMarker: L.Marker | null = null;
let accuracyCircle: L.Circle | null = null;
let trailGlow: L.Polyline | null = null;
let trailLine: L.Polyline | null = null;
let resizeObserver: ResizeObserver | null = null;

const pin = (className: string, html: string) =>
  L.divIcon({ className: `live-map-pin ${className}`, html, iconSize: [36, 36], iconAnchor: [18, 18] });

onMounted(() => {
  if (!mapRef.value) return;

  map = L.map(mapRef.value, { zoomControl: false, scrollWheelZoom: false, attributionControl: true });
  // Some mobile networks can't reach the OSM tile servers, which left a blank
  // map. If the first tiles keep failing, switch to Esri's street map, which
  // is served from a different network and needs no API key.
  const osm = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);
  let osmLoaded = 0;
  let osmFailed = 0;
  osm.on("tileload", () => osmLoaded++);
  osm.on("tileerror", () => {
    if (++osmFailed < 4 || osmLoaded > 0 || !map) return;
    osm.remove();
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 19,
      attribution: "Tiles &copy; Esri",
    }).addTo(map);
  });
  L.control.zoom({ position: "bottomright" }).addTo(map);

  // Planned route: faint and dashed — the tour operator may choose another way.
  L.polyline(ROUTE.path, { color: "#ffb020", weight: 4, opacity: 0.55, lineCap: "round", dashArray: "1 9" }).addTo(map);

  // Where the rider has actually been: a bright glowing line, on top.
  trailGlow = L.polyline(trail, { color: "#34bfff", weight: 12, opacity: 0.25, lineCap: "round", lineJoin: "round" }).addTo(map);
  trailLine = L.polyline(trail, { color: "#34bfff", weight: 5, opacity: 1, lineCap: "round", lineJoin: "round" }).addTo(map);

  L.marker(props.gateCoords ?? ROUTE.start.coords, { icon: pin("live-map-pin-start", String(props.gate)), keyboard: false })
    .bindTooltip(`Start · Gate ${props.gate}`, { direction: "top", offset: [0, -16] })
    .addTo(map);
  L.marker(ROUTE.destination.coords, { icon: pin("live-map-pin-end", "🏁"), keyboard: false })
    .bindTooltip(ROUTE.destination.name, { direction: "top", offset: [0, -16], permanent: true })
    .addTo(map);

  map.fitBounds(L.latLngBounds(ROUTE.path), { padding: [28, 28] });
  // A drag means the player wants to look around: stop auto-centring.
  map.on("dragstart", () => (following.value = false));

  // Leaflet measures its box once. The box changes after that (screen slide-in,
  // the phone's address bar showing and hiding), which leaves unloaded grey
  // tiles — so re-measure whenever it resizes.
  resizeObserver = new ResizeObserver(() => map?.invalidateSize());
  resizeObserver.observe(mapRef.value);
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  map?.remove();
  map = null;
});

const extendTrail = (next: LatLng) => {
  if ((accuracy.value ?? Infinity) > MAX_ACCURACY_M) return;
  const last = trail[trail.length - 1];
  if (last && distanceMeters(last, next) < MIN_STEP_M) return;
  trail.push(next);
  trailGlow?.addLatLng(next);
  trailLine?.addLatLng(next);
  saveTrail();
};

watch(position, (next) => {
  if (!map || !next) return;
  extendTrail(next);
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

/** The rider has left the planned route, e.g. the tour took another street. */
const offRoute = computed(() => !!position.value && distanceToPath(ROUTE.path, position.value) > OFF_ROUTE_M);

// On the planned route: distance along it. Off it: straight-line distance,
// since we don't know which streets the tour will take.
const remaining = computed(() => {
  if (!position.value) return null;
  return offRoute.value
    ? distanceMeters(position.value, ROUTE.destination.coords as LatLng)
    : remainingAlongPath(ROUTE.path, position.value);
});
// Same test as the "Confirm delivered" button, so the map and the button agree.
const arrived = computed(
  () =>
    !!position.value &&
    isWithinDelivery(position.value, accuracy.value, ROUTE.destination.coords as LatLng, DELIVERY.radiusMeters),
);

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
      <span class="live-map-info-text">
        <template v-if="arrived">
          <span class="live-map-info-main live-map-info-arrived">You've arrived! 🎉</span>
          <span class="live-map-info-sub">"Confirm delivered" is unlocked below.</span>
        </template>
        <template v-else-if="status === 'tracking' && remaining !== null">
          <span class="live-map-info-main">{{ offRoute ? "~" : "" }}{{ formatDistance(remaining) }} to go</span>
          <span class="live-map-info-sub">
            {{ offRoute ? "Taking another way — the map follows you." : `to ${ROUTE.destination.name}` }}
          </span>
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
      </span>

      <span class="live-map-legend" aria-hidden="true">
        <span><i class="live-map-legend-trail"></i>Your ride</span>
        <span><i class="live-map-legend-plan"></i>Suggested</span>
      </span>
    </figcaption>
  </figure>
</template>

<style scoped lang="scss">
.live-map {
  position: relative;
  // Leaflet stacks its panes at z-index 400–1000; keep them inside the map so
  // they can't cover the sticky action bar while the page scrolls under it.
  isolation: isolate;
  margin: 0;
  border-radius: var(--radius-md);
  border: 1px solid rgba(52, 191, 255, 0.35);
  background: rgba(2, 10, 28, 0.6);
  overflow: hidden;

  &-canvas {
    // The order screen makes this taller while riding.
    height: var(--live-map-height, 300px);
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
    height: var(--live-map-height, 300px);
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
    align-items: center;
    justify-content: space-between;
    gap: var(--space-sm);
    padding: 8px var(--space-md);
    border-top: 1px solid rgba(52, 191, 255, 0.2);

    &-text {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    &-main {
      font-size: 17px;
      font-weight: 900;
      color: var(--color-amber-300);
    }

    &-arrived {
      color: var(--color-green-400);
    }

    &-sub {
      font-size: 12px;
      color: var(--color-text-300);
    }
  }

  &-legend {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 11px;
    color: var(--color-text-300);

    span {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    i {
      display: inline-block;
      width: 22px;
      height: 4px;
      border-radius: 2px;
    }

    &-trail {
      background: var(--color-cyan-400);
      box-shadow: 0 0 6px var(--color-cyan-400);
    }

    &-plan {
      background: repeating-linear-gradient(90deg, var(--color-amber-400) 0 3px, transparent 3px 7px);
    }
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
