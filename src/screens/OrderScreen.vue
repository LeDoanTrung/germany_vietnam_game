<script setup lang="ts">
import { computed, defineAsyncComponent, ref, watch } from "vue";
import AppHeader from "../components/AppHeader.vue";
import HoloPanel from "../components/HoloPanel.vue";
import ScrambleText from "../components/ScrambleText.vue";
import StatusStepper from "../components/StatusStepper.vue";
import StatusBadge from "../components/StatusBadge.vue";
import RouteMap from "../components/RouteMap.vue";
import InfoRow from "../components/InfoRow.vue";
import ActionBar from "../components/ActionBar.vue";
import GameButton from "../components/GameButton.vue";
import { DELIVERY, formatVnd } from "../config/game";
import { ROUTE, type LatLng } from "../config/route";
import { statusSentence } from "../config/status";
import { claimOf, statusOf, useGame } from "../store/game";
import { sounds } from "../composables/useSound";
import { useGeolocation } from "../composables/useGeolocation";
import { useWakeLock } from "../composables/useWakeLock";
import { distanceMeters, formatDistance, isWithinDelivery } from "../utils/geo";

// The real map pulls in Leaflet, so it only loads once someone is actually riding.
const LiveMap = defineAsyncComponent(() => import("../components/LiveMap.vue"));

// One frame for the whole order, as the client described it: "Accept order"
// takes it (nobody else can afterwards) and shows where to wait; then the ride,
// and "Confirm delivered" opens the congrats pop-up.
const { state, currentOrder, myOrder, earnings, back, acceptOrder, confirmDelivered, openOrder, showNotice } = useGame();

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

const handleAccept = () => {
  sounds.confirm();
  void acceptOrder();
};

// ---- Delivery gate ---------------------------------------------------------
// "Confirm delivered" only unlocks near the destination. If GPS can't help
// (location off, no signal, bad indoor fix) the organiser can unlock it with a code.

const { position, accuracy, status: gpsStatus, start: startGps, resumeIfAllowed } = useGeolocation();
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

const showCodeForm = ref(false);
const codeInput = ref("");

const submitCode = () => {
  if (codeInput.value.trim().toUpperCase() !== DELIVERY.unlockCode.toUpperCase()) {
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
  void confirmDelivered();
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
      <StatusStepper :current="STEP_FOR_STATUS[status]" />

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
          <span class="order-gate-place">{{ currentOrder.from.address }}</span>
        </span>
      </HoloPanel>

      <div v-if="isMine && status === 'delivering'" class="order-map-toggle" role="group" aria-label="Map view">
        <button type="button" :aria-pressed="mapView === 'live'" @click="setMapView('live')">📍 Live map</button>
        <button type="button" :aria-pressed="mapView === 'animated'" @click="setMapView('animated')">✨ Animation</button>
      </div>

      <LiveMap v-if="showLiveMap" :gate="currentOrder.gate" :order-id="currentOrder.id" />
      <RouteMap v-else :order="currentOrder" :mode="MAP_MODE[status]" />

      <HoloPanel :delay="0.2">
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
        <div v-if="!canConfirm" class="order-gate-status" aria-live="polite">
          <template v-if="gpsStatus === 'tracking' && distanceLeft !== null">
            🔒 Get within {{ DELIVERY.radiusMeters }} m of {{ currentOrder.to.name }} to confirm —
            <b>{{ formatDistance(distanceLeft) }} away</b>
          </template>
          <template v-else-if="gpsStatus === 'requesting'">📍 Finding your location… allow it when your phone asks.</template>
          <template v-else-if="gpsStatus === 'denied'">
            📍 Location is off. Turn it on in your browser settings, or ask the organiser for the unlock code.
          </template>
          <template v-else-if="gpsStatus === 'unavailable'">
            📍 No GPS signal. Move into the open, or ask the organiser for the unlock code.
          </template>
          <template v-else>🔒 "Confirm delivered" unlocks when you reach {{ currentOrder.to.name }}.</template>
        </div>

        <GameButton v-if="gpsStatus === 'idle' && !canConfirm" block @click="handleTurnOnLocation">
          📍 Turn on location
        </GameButton>

        <GameButton
          variant="success"
          block
          :disabled="state.busy || !canConfirm"
          :tap-sound="false"
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
          Confirm delivered
        </GameButton>

        <!-- Organiser override -->
        <template v-if="!canConfirm">
          <form v-if="showCodeForm" class="order-code" @submit.prevent="submitCode">
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
          <button v-else type="button" class="order-code-link" @click="showCodeForm = true">
            Can't get a GPS fix? Enter the organiser code
          </button>
        </template>
      </template>

      <!-- Someone else's order, or finished -->
      <template v-else>
        <p v-if="!isMine" class="order-hint">This order is taken by {{ claim?.shipper }}.</p>
        <GameButton variant="ghost" block @click="back">Back to orders</GameButton>
      </template>
    </ActionBar>
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

  &-map-toggle {
    display: grid;
    grid-template-columns: 1fr 1fr;
    padding: 4px;
    border: 1px solid rgba(52, 191, 255, 0.35);
    border-radius: var(--radius-pill);
    background: rgba(2, 10, 28, 0.5);

    button {
      min-height: 40px;
      border: none;
      border-radius: var(--radius-pill);
      background: transparent;
      color: var(--color-text-300);
      font-weight: 700;
      font-size: 14px;
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

  &-code-link {
    min-height: 36px;
    border: none;
    background: none;
    color: var(--color-text-300);
    font-size: 13px;
    text-decoration: underline;
    cursor: pointer;
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
