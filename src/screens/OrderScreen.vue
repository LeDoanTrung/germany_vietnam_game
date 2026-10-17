<script setup lang="ts">
import { computed, defineAsyncComponent, onBeforeUnmount, onErrorCaptured, ref, watch } from "vue";
import AppHeader from "../components/AppHeader.vue";
import HoloPanel from "../components/HoloPanel.vue";
import ScrambleText from "../components/ScrambleText.vue";
import StatusStepper from "../components/StatusStepper.vue";
import StatusBadge from "../components/StatusBadge.vue";
import RouteMap from "../components/RouteMap.vue";
import InfoRow from "../components/InfoRow.vue";
import ActionBar from "../components/ActionBar.vue";
import GameButton from "../components/GameButton.vue";
import LocationHelp from "../components/LocationHelp.vue";
import SafetySheet from "../components/SafetySheet.vue";
import { DELIVERY, formatVnd, gateInfo } from "../config/game";
import { RELEASE_WINDOW_MS } from "../services/claims";
import { ROUTE, type LatLng } from "../config/route";
import { statusSentence } from "../config/status";
import { claimOf, statusOf, useGame } from "../store/game";
import { sounds } from "../composables/useSound";
import { useGeolocation } from "../composables/useGeolocation";
import { useWakeLock } from "../composables/useWakeLock";
import { distanceMeters, formatDistance, isWithinDelivery } from "../utils/geo";

// The real map pulls in Leaflet, so it only loads once someone is actually riding.
// A failed load (flaky network, or a page left open across a deploy) is
// retried twice; after that onErrorCaptured below shows a Reload button.
const LiveMap = defineAsyncComponent({
  loader: () => import("../components/LiveMap.vue"),
  onError: (_error, retry, fail, attempts) => {
    if (attempts <= 2) window.setTimeout(retry, 1000 * attempts);
    else fail();
  },
});

// One frame for the whole order, as the client described it: "Accept order"
// takes it (nobody else can afterwards) and shows where to wait; then the ride,
// and "Confirm delivered" opens the congrats pop-up.
const {
  state,
  currentOrder,
  myOrder,
  earnings,
  back,
  acceptOrder,
  confirmDelivered,
  canRelease,
  releaseOrder,
  openOrder,
  showNotice,
} = useGame();

const status = computed(() => (currentOrder.value ? statusOf(currentOrder.value.id) : "available"));
const claim = computed(() => (currentOrder.value ? claimOf(currentOrder.value.id) : undefined));
const isMine = computed(() => !!claim.value?.mine);
/** This player already took a different order. */
const hasOtherOrder = computed(() => !!myOrder.value && myOrder.value.id !== currentOrder.value?.id);

const STEP_FOR_STATUS = { available: 1, delivering: 2, delivered: 4 } as const;
const MAP_MODE = { available: "waiting", delivering: "delivering", delivered: "done" } as const;

/** While riding, the player can flip between the real map and the cartoon one. */
const mapView = ref<"live" | "animated">("live");
const showLiveMap = computed(() => isMine.value && status.value === "delivering" && mapView.value === "live");

// Anything going wrong inside the map (it failed to load, or crashed) used to
// leave a blank gap. Show a Reload button there instead; the rest keeps working.
const liveMapCrashed = ref(false);
onErrorCaptured((error) => {
  if (!showLiveMap.value) return;
  console.error("Live map failed.", error);
  liveMapCrashed.value = true;
  return false;
});
const reloadPage = () => window.location.reload();

/** The folded order/gate strip at the top while riding. */
const tripOpen = ref(false);

const handleAccept = () => {
  sounds.confirm();
  void acceptOrder();
};

// ---- Delivery gate ---------------------------------------------------------
// "Confirm delivered" only unlocks near the destination. If GPS can't help
// (location off, no signal, bad indoor fix) the organiser can unlock it with a code.

const { position, accuracy, status: gpsStatus, start: startGps, retry: retryGps, resumeIfAllowed } = useGeolocation();

/** iPhone with "Precise Location" off reports a fix kilometres wide — it can never unlock. */
const approximateOnly = computed(() => gpsStatus.value === "tracking" && (accuracy.value ?? 0) > 500);

const handleRetryLocation = () => {
  sounds.tap();
  retryGps();
};
const { request: keepScreenOn } = useWakeLock();

const isRiding = computed(() => isMine.value && status.value === "delivering");

// Pick GPS back up on its own when the player already allowed it (e.g. after a reload).
watch(
  isRiding,
  (riding) => {
    if (riding) void resumeIfAllowed();
  },
  { immediate: true },
);

const destination = ROUTE.destination.coords as LatLng;
const distanceLeft = computed(() => (position.value ? distanceMeters(position.value, destination) : null));
const nearDestination = computed(
  () => !!position.value && isWithinDelivery(position.value, accuracy.value, destination, DELIVERY.radiusMeters),
);

watch(nearDestination, (near, before) => {
  if (near && !before && isRiding.value) sounds.success();
});

// Unlocked by the organiser code, remembered per order so a reload keeps it.
const unlockKey = computed(() => `shipper-game:unlocked:${currentOrder.value?.id}`);
const readUnlocked = () => {
  try {
    return localStorage.getItem(unlockKey.value) === "1";
  } catch {
    return false;
  }
};
const organiserUnlocked = ref(readUnlocked());
watch(unlockKey, () => (organiserUnlocked.value = readUnlocked()));

const canConfirm = computed(() => nearDestination.value || organiserUnlocked.value);

/** GPS can't unlock the button: say why and offer Try again. */
const locationProblem = computed(
  () => !canConfirm.value && (gpsStatus.value === "denied" || gpsStatus.value === "unavailable" || approximateOnly.value),
);
/** What the locked "Confirm delivered" button says instead. */
const lockedLabel = computed(() => {
  if (gpsStatus.value === "requesting") return "Finding your location…";
  if (distanceLeft.value !== null) return `${formatDistance(distanceLeft.value)} to go`;
  return "Locked until you arrive";
});

const showCodeForm = ref(false);
const codeInput = ref("");

// The code is set by the organiser on the organiser page (shared through Firebase).
const submitCode = () => {
  const expected = state.settings.unlockCode.trim().toUpperCase();
  if (!expected) {
    sounds.tap();
    showNotice("The organiser hasn't set an unlock code yet.");
    return;
  }
  if (codeInput.value.trim().toUpperCase() !== expected) {
    sounds.tap();
    showNotice("That code isn't right — ask the organiser again.");
    return;
  }
  sounds.confirm();
  organiserUnlocked.value = true;
  showCodeForm.value = false;
  try {
    localStorage.setItem(unlockKey.value, "1");
  } catch {
    // Not persisted — they'd need the code again after a reload.
  }
};

const handleTurnOnLocation = () => {
  sounds.tap();
  startGps();
  keepScreenOn();
};

const handleDelivered = () => {
  if (!canConfirm.value) return;
  sounds.success();
  confirmDelivered();
};

// ---- Release ("picked the wrong order") ------------------------------------

// Ticks so the "x min left" countdown and the button's disappearance stay current.
const now = ref(Date.now());
const clock = window.setInterval(() => (now.value = Date.now()), 15000);
onBeforeUnmount(() => window.clearInterval(clock));

// Re-read the clock when the order is taken, so the countdown starts at 10 min, not 11.
watch(
  () => claim.value?.claimedAt,
  () => (now.value = Date.now()),
);

const releasable = computed(() => !!currentOrder.value && canRelease(currentOrder.value.id, now.value));
const releaseMinutesLeft = computed(() => {
  const claimedAt = claim.value?.claimedAt ?? now.value;
  const left = Math.ceil((claimedAt + RELEASE_WINDOW_MS - now.value) / 60000);
  return Math.min(RELEASE_WINDOW_MS / 60000, Math.max(1, left));
});

// Two taps, so a stray touch can't throw the order away.
const confirmingRelease = ref(false);
let releaseTimer = 0;
const handleRelease = () => {
  sounds.tap();
  if (!confirmingRelease.value) {
    confirmingRelease.value = true;
    window.clearTimeout(releaseTimer);
    releaseTimer = window.setTimeout(() => (confirmingRelease.value = false), 4000);
    return;
  }
  confirmingRelease.value = false;
  void releaseOrder();
};

// ---- Gate details and the one-time safety sheet ----------------------------

const gate = computed(() => (currentOrder.value ? gateInfo(currentOrder.value.gate) : undefined));

const SAFETY_KEY = "shipper-game:safety-seen";
const safetySeen = () => {
  try {
    return localStorage.getItem(SAFETY_KEY) === "1";
  } catch {
    return false;
  }
};
const safetyOpen = ref(false);

// ---- Location ---------------------------------------------------------------
// Taking an order turns location on straight away, so the phone's own
// permission prompt is the only extra tap (browsers always require it).
// Players who allowed it before aren't asked again — GPS just starts.

const startLocationAfterAccept = async () => {
  if (await resumeIfAllowed()) return;
  if (gpsStatus.value !== "idle") return;
  startGps();
  keepScreenOn();
};

// Right after the player takes the order (not when reopening it later).
watch(
  () => [isMine.value, status.value] as const,
  ([mine, current], previous) => {
    const justTaken = mine && current === "delivering" && previous?.[1] === "available";
    if (!justTaken) return;
    if (!safetySeen()) safetyOpen.value = true;
    void startLocationAfterAccept();
  },
);

const closeSafety = () => {
  safetyOpen.value = false;
  try {
    localStorage.setItem(SAFETY_KEY, "1");
  } catch {
    // Shown again next time; harmless.
  }
};

const setMapView = (view: "live" | "animated") => {
  sounds.tap();
  mapView.value = view;
};
</script>

<template>
  <div v-if="currentOrder" class="order">
    <AppHeader :title="`Order ${currentOrder.number}`" show-back :earnings="earnings" @back="back" />

    <div class="order-content">
      <StatusStepper v-if="!isRiding" :current="STEP_FOR_STATUS[status]" />

      <!-- While riding the map is the main thing: the order and the gate shrink
           to one tappable strip with the details folded away. -->
      <button
        v-if="isRiding"
        type="button"
        class="order-trip"
        :aria-expanded="tripOpen"
        @click="tripOpen = !tripOpen"
      >
        <span class="order-gate-number order-trip-gate" aria-hidden="true">{{ currentOrder.gate }}</span>
        <span class="order-trip-body">
          <span class="order-trip-title">
            Wait at <b>Gate {{ currentOrder.gate }}</b> · {{ currentOrder.item }} × {{ currentOrder.quantity }}
          </span>
          <span v-if="gate?.hint" :class="['order-gate-hint', { 'order-trip-clamp': !tripOpen }]">{{ gate.hint }}</span>
          <span v-if="tripOpen" class="order-gate-place">{{ currentOrder.from.address }}</span>
        </span>
        <span class="order-trip-chevron" aria-hidden="true">{{ tripOpen ? "▴" : "▾" }}</span>
      </button>

      <template v-else>
        <!-- Keyed on status so the panel scans in again whenever the status changes. -->
        <HoloPanel :key="status" class="order-headline" :tone="status === 'delivered' ? 'green' : status === 'available' ? 'cyan' : 'amber'">
          <StatusBadge :status="status" />
          <h2 class="order-title">
            Deliver <ScrambleText :text="currentOrder.item" class="order-title-item" :delay="0.15" />
            <small>× {{ currentOrder.quantity }}</small>
          </h2>
          <p class="order-route">
            from <b>Gate {{ currentOrder.gate }}</b> to <b>{{ currentOrder.to.name }}</b>
          </p>
          <p :class="['order-status', `order-status-${status}`]">
            {{ statusSentence(status, claim?.shipper)
            }}<span v-if="status !== 'delivered'" class="order-status-dots" aria-hidden="true"></span>
          </p>
        </HoloPanel>

        <!-- Where to stand: revealed once the player has taken the order. -->
        <HoloPanel v-if="isMine" tone="amber" class="order-gate">
          <span class="order-gate-number" aria-hidden="true">{{ currentOrder.gate }}</span>
          <span>
            <span class="order-gate-label">Your pick-up point</span>
            <span class="order-gate-text">Wait at <b>Gate {{ currentOrder.gate }}</b></span>
            <span v-if="gate?.hint" class="order-gate-hint">{{ gate.hint }}</span>
            <span class="order-gate-place">{{ currentOrder.from.address }}</span>
          </span>
        </HoloPanel>
      </template>

      <div :class="['order-map', { 'order-map-riding': isRiding }]">
        <!-- Floats on the map instead of taking a row of its own. -->
        <div v-if="isRiding" class="order-map-toggle" role="group" aria-label="Map view">
          <button type="button" :aria-pressed="mapView === 'live'" @click="setMapView('live')">📍 Live</button>
          <button type="button" :aria-pressed="mapView === 'animated'" @click="setMapView('animated')">✨ Cartoon</button>
        </div>

        <div v-if="showLiveMap && liveMapCrashed" class="order-map-error">
          <p>The live map couldn't load.</p>
          <button type="button" @click="reloadPage">↻ Reload</button>
        </div>
        <LiveMap
          v-else-if="showLiveMap"
          :gate="currentOrder.gate"
          :gate-coords="gate?.coords ?? null"
          :order-id="currentOrder.id"
        />
        <RouteMap v-else :order="currentOrder" :mode="MAP_MODE[status]" />
      </div>

      <!-- Folded away while riding; open otherwise. -->
      <component :is="isRiding ? 'details' : 'div'" class="order-details">
        <summary v-if="isRiding">Order details</summary>
        <HoloPanel :delay="isRiding ? 0 : 0.2">
          <InfoRow label="Shipper" badge="🛵" highlight>{{ claim?.shipper ?? "Not taken yet" }}</InfoRow>
          <InfoRow label="Start point" :badge="currentOrder.from.label">
            {{ currentOrder.from.name }}
            <small>{{ currentOrder.from.address }}</small>
          </InfoRow>
          <InfoRow label="End point" :badge="currentOrder.to.label">
            {{ currentOrder.to.name }}
            <small>{{ currentOrder.to.address }}</small>
          </InfoRow>
          <InfoRow label="Distance · Shipping fee">
            {{ currentOrder.distanceKm }} km · <span class="order-reward mono">{{ formatVnd(currentOrder.reward) }}</span>
          </InfoRow>
          <InfoRow v-if="currentOrder.note" label="Note">{{ currentOrder.note }}</InfoRow>
        </HoloPanel>
      </component>
    </div>

    <ActionBar>
      <!-- Free order -->
      <template v-if="status === 'available'">
        <template v-if="hasOtherOrder && myOrder">
          <p class="order-hint">You already have Order {{ myOrder.number }} — one order per shipper.</p>
          <GameButton block @click="openOrder(myOrder.id)">Open my order</GameButton>
        </template>
        <GameButton v-else block :disabled="state.busy" :tap-sound="false" @click="handleAccept">
          <svg class="order-button-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3 20 7.5v9L12 21 4 16.5v-9Z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" />
            <path d="m8.5 12 2.5 2.5 4.5-5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          {{ state.busy ? "Taking order…" : "Accept order" }}
        </GameButton>
      </template>

      <!-- My order, on the way: locked until the rider reaches the destination -->
      <template v-else-if="isRiding">
        <!-- Only problems get a message; a normal ride is summed up on the button itself. -->
        <div v-if="locationProblem" class="order-gate-status" aria-live="polite">
          <template v-if="approximateOnly">
            📍 Only an <b>approximate</b> location. Switch <b>Precise Location</b> on for this browser in Settings, then
            tap Try again.
          </template>
          <template v-else-if="gpsStatus === 'denied'">📍 Location is off — turn it on, or ask the organiser for the code.</template>
          <template v-else>📍 No GPS signal — move into the open, or ask the organiser for the code.</template>
          <LocationHelp class="order-location-help" />
        </div>

        <GameButton v-if="gpsStatus === 'idle' && !canConfirm" block @click="handleTurnOnLocation">
          📍 Turn on location
        </GameButton>
        <GameButton v-else-if="locationProblem" block :tap-sound="false" @click="handleRetryLocation">
          📍 Try again
        </GameButton>

        <GameButton
          v-else
          variant="success"
          block
          :class="{ 'order-confirm-locked': !canConfirm }"
          :disabled="state.busy || !canConfirm"
          :tap-sound="false"
          :aria-label="canConfirm ? 'Confirm delivered' : `Confirm delivered — locked, ${lockedLabel}`"
          @click="handleDelivered"
        >
          <svg class="order-button-icon" viewBox="0 0 24 24" aria-hidden="true">
            <template v-if="canConfirm">
              <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.2" />
              <path d="m7.8 12.3 2.9 2.9 5.5-6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
            </template>
            <template v-else>
              <rect x="5" y="11" width="14" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="2.2" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
            </template>
          </svg>
          <span v-if="canConfirm">Confirm delivered</span>
          <span v-else class="order-confirm-text">
            {{ lockedLabel }}
            <small>Unlocks within {{ DELIVERY.radiusMeters }} m of the drop-off</small>
          </span>
        </GameButton>

        <form v-if="showCodeForm && !canConfirm" class="order-code" @submit.prevent="submitCode">
          <input
            v-model="codeInput"
            class="order-code-input"
            type="text"
            inputmode="text"
            autocapitalize="characters"
            autocomplete="off"
            placeholder="Organiser code"
            aria-label="Organiser unlock code"
          />
          <GameButton type="submit" variant="ghost">Unlock</GameButton>
        </form>

        <!-- Secondary actions share one quiet row. -->
        <div v-if="(!canConfirm && !showCodeForm) || releasable" class="order-more">
          <button v-if="!canConfirm && !showCodeForm" type="button" class="order-more-link" @click="showCodeForm = true">
            🔑 Organiser code
          </button>
          <!-- Picked the wrong order: give it back while still at the gate -->
          <button
            v-if="releasable"
            type="button"
            :class="['order-more-link', 'order-release', { 'order-release-confirm': confirmingRelease }]"
            :disabled="state.busy"
            @click="handleRelease"
          >
            <template v-if="confirmingRelease">Tap again to release</template>
            <template v-else>↩ Wrong order? ({{ releaseMinutesLeft }} min)</template>
          </button>
        </div>
      </template>

      <!-- Someone else's order, or finished -->
      <template v-else>
        <p v-if="!isMine" class="order-hint">This order is taken by {{ claim?.shipper }}.</p>
        <GameButton variant="ghost" block @click="back">Back to orders</GameButton>
      </template>
    </ActionBar>

    <Teleport to="#phone">
      <SafetySheet :open="safetyOpen" @close="closeSafety" />
    </Teleport>
  </div>
</template>

<style scoped lang="scss">
.order {
  display: flex;
  flex-direction: column;
  min-height: 100%;

  &-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    padding: var(--space-sm) var(--space-md) 0;
  }

  &-headline {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-sm);
  }

  &-title {
    font-size: 26px;
    font-weight: 900;
    line-height: 1.15;

    small {
      font-size: 16px;
      color: var(--color-text-300);
    }

    &-item {
      color: var(--color-amber-300);
    }
  }

  &-route {
    margin-top: -4px;
    color: var(--color-text-300);

    b {
      color: var(--color-cyan-100);
    }
  }

  &-status {
    --tone: var(--color-cyan-400);

    align-self: stretch;
    padding: 8px 12px;
    border-radius: var(--radius-sm);
    border-left: 3px solid var(--tone);
    background: rgba(255, 255, 255, 0.06); // fallback: color-mix needs iOS 16.2+
    background: color-mix(in srgb, var(--tone) 12%, transparent);
    font-size: 15px;
    font-weight: 700;

    &-delivering {
      --tone: var(--color-amber-400);
    }

    &-delivered {
      --tone: var(--color-green-400);
    }

    // Animated ellipsis while the order is still in motion.
    &-dots::after {
      content: "";
      display: inline-block;
      width: 1.2em;
      text-align: left;
      animation: order-dots 1.4s steps(4, end) infinite;
    }
  }

  // "Wait at Gate 2" — the big, can't-miss instruction after taking an order.
  &-gate {
    display: flex;
    align-items: center;
    gap: var(--space-md);

    &-number {
      flex-shrink: 0;
      display: grid;
      place-items: center;
      width: 64px;
      height: 64px;
      border-radius: var(--radius-md);
      background: var(--color-amber-400);
      color: #1d1200;
      font-size: 36px;
      font-weight: 900;
      box-shadow: 0 0 24px rgba(255, 176, 32, 0.5);
    }

    &-label {
      display: block;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--color-amber-300);
    }

    &-text {
      display: block;
      font-size: 22px;
      font-weight: 900;
    }

    &-place {
      display: block;
      font-size: 13px;
      color: var(--color-text-300);
    }
  }

  // The folded order + gate strip shown while riding.
  &-trip {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    width: 100%;
    padding: 10px 12px;
    border: 1px solid rgba(255, 176, 32, 0.55);
    border-radius: var(--radius-md);
    background: rgba(10, 30, 66, 0.85);
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;

    &-gate {
      width: 46px;
      height: 46px;
      font-size: 26px;
      box-shadow: 0 0 16px rgba(255, 176, 32, 0.45);
    }

    &-body {
      flex: 1;
      min-width: 0;
    }

    &-title {
      display: block;
      font-size: 15px;
      font-weight: 700;
      color: var(--color-text-300);

      b {
        font-size: 18px;
        font-weight: 900;
        color: var(--color-text-100);
      }
    }

    &-clamp {
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    &-chevron {
      flex-shrink: 0;
      color: var(--color-amber-300);
      font-size: 14px;
    }
  }

  &-map {
    position: relative;

    // While riding the map takes whatever height the strip and the buttons leave.
    &-riding {
      --live-map-height: max(300px, calc(100vh - 330px));
      --live-map-height: max(300px, calc(100dvh - 330px));
    }
  }

  // Small switch floating on the map's top-left corner.
  &-map-toggle {
    position: absolute;
    top: 10px;
    left: 10px;
    z-index: 2;
    display: flex;
    padding: 3px;
    border: 1px solid rgba(52, 191, 255, 0.45);
    border-radius: var(--radius-pill);
    background: rgba(2, 10, 28, 0.88);
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);

    button {
      min-height: 34px;
      padding: 0 12px;
      border: none;
      border-radius: var(--radius-pill);
      background: transparent;
      color: var(--color-text-300);
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
      transition:
        background-color 0.2s ease,
        color 0.2s ease;

      &[aria-pressed="true"] {
        background: var(--color-cyan-400);
        color: #001a2e;
      }
    }
  }

  // "Order details", folded while riding.
  &-details > summary {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 44px;
    border: 1px dashed rgba(52, 191, 255, 0.4);
    border-radius: var(--radius-pill);
    color: var(--color-cyan-100);
    font-size: 14px;
    font-weight: 700;
    list-style: none;
    cursor: pointer;

    &::-webkit-details-marker {
      display: none;
    }

    &::after {
      content: "▾";
      margin-left: 6px;
    }
  }

  &-details[open] > summary {
    margin-bottom: var(--space-sm);

    &::after {
      content: "▴";
    }
  }

  // Shown in place of the live map if it can't be loaded.
  &-map-error {
    display: grid;
    justify-items: center;
    gap: 10px;
    padding: 72px 16px 28px;
    border: 1px solid rgba(52, 191, 255, 0.35);
    border-radius: var(--radius-md);
    background: rgba(2, 10, 28, 0.6);
    color: var(--color-text-300);
    text-align: center;

    p {
      margin: 0;
    }

    button {
      min-height: 40px;
      padding: 0 20px;
      border: none;
      border-radius: var(--radius-pill);
      background: var(--color-cyan-400);
      color: #001a2e;
      font-weight: 700;
      font-size: 14px;
      cursor: pointer;
    }
  }

  // Why "Confirm delivered" is still locked, and how far is left.
  &-gate-status {
    padding: 10px 14px;
    border-radius: var(--radius-sm);
    border-left: 3px solid var(--color-amber-400);
    background: rgba(10, 30, 66, 0.92);
    font-size: 14px;
    color: var(--color-text-100);

    b {
      color: var(--color-amber-300);
      white-space: nowrap;
    }
  }

  &-code {
    display: flex;
    gap: var(--space-xs);

    &-input {
      flex: 1;
      min-width: 0;
      min-height: 48px;
      padding: 10px 14px;
      border: 1px solid rgba(52, 191, 255, 0.5);
      border-radius: var(--radius-pill);
      background: rgba(2, 10, 28, 0.85);
      color: var(--color-text-100);
      font-family: var(--font-mono);
      // 16px+ stops iOS Safari zooming in when the field is focused.
      font-size: 16px;
      letter-spacing: 0.12em;
      text-transform: uppercase;

      &:focus {
        outline: none;
        border-color: var(--color-amber-400);
      }
    }
  }

  &-location-help {
    margin-top: 6px;
  }

  &-gate-hint {
    display: block;
    margin-top: 2px;
    font-size: 14px;
    font-weight: 700;
    color: var(--color-amber-300);
  }

  // Two lines on the locked button: how far, then what unlocks it.
  &-confirm-text {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    line-height: 1.15;

    small {
      font-size: 12px;
      font-weight: 600;
      opacity: 0.85;
    }
  }

  // Organiser code + release: one quiet row under the main button.
  &-more {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: var(--space-xs);

    &-link {
      min-height: 36px;
      padding: 0 14px;
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-radius: var(--radius-pill);
      background: rgba(2, 10, 28, 0.6);
      color: var(--color-text-300);
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
    }
  }

  &-release {
    border-color: rgba(255, 93, 108, 0.45);

    &-confirm {
      border-color: var(--color-red-400);
      background: var(--color-red-400);
      color: #fff;
    }
  }

  &-hint {
    font-size: 14px;
    color: var(--color-text-300);
    text-align: center;
  }

  &-reward {
    color: var(--color-amber-300);
  }

  &-button-icon {
    width: 22px;
    height: 22px;
  }
}

@keyframes order-dots {
  0% {
    content: "";
  }
  25% {
    content: ".";
  }
  50% {
    content: "..";
  }
  75%,
  100% {
    content: "...";
  }
}
</style>
