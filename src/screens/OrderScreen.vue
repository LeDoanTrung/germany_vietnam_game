<script setup lang="ts">
import { computed } from "vue";
import AppHeader from "../components/AppHeader.vue";
import HoloPanel from "../components/HoloPanel.vue";
import ScrambleText from "../components/ScrambleText.vue";
import StatusStepper from "../components/StatusStepper.vue";
import StatusBadge from "../components/StatusBadge.vue";
import RouteMap from "../components/RouteMap.vue";
import InfoRow from "../components/InfoRow.vue";
import ActionBar from "../components/ActionBar.vue";
import GameButton from "../components/GameButton.vue";
import { formatVnd } from "../config/game";
import { statusSentence } from "../config/status";
import { statusOf, useGame } from "../store/game";
import { sounds } from "../composables/useSound";

// One frame for the whole order, as the client described it: "Accept order" turns
// it into a live delivery, and "Confirm delivered" opens the congrats pop-up.
const { currentOrder, earnings, back, acceptOrder, confirmDelivered } = useGame();

const status = computed(() => (currentOrder.value ? statusOf(currentOrder.value.id) : "dispatching"));

const STEP_FOR_STATUS = { dispatching: 0, delivering: 2, delivered: 4 } as const;
const MAP_MODE = { dispatching: "waiting", delivering: "delivering", delivered: "done" } as const;

const handleAccept = () => {
  sounds.confirm();
  acceptOrder();
};

const handleDelivered = () => {
  sounds.success();
  confirmDelivered();
};
</script>

<template>
  <div v-if="currentOrder" class="order">
    <AppHeader :title="`Order ${currentOrder.number}`" show-back :earnings="earnings" @back="back" />

    <div class="order-content">
      <StatusStepper :current="STEP_FOR_STATUS[status]" />

      <!-- Keyed on status so the panel scans in again whenever the status changes. -->
      <HoloPanel :key="status" class="order-headline" :tone="status === 'delivered' ? 'green' : 'amber'">
        <StatusBadge :status="status" />
        <h2 class="order-title">
          Deliver <ScrambleText :text="currentOrder.item" class="order-title-item" :delay="0.15" />
          <small>× {{ currentOrder.quantity }}</small>
        </h2>
        <p class="order-route">
          from <b>{{ currentOrder.from.name }}</b> to <b>{{ currentOrder.to.name }}</b>
        </p>
        <p :class="['order-status', `order-status-${status}`]">
          {{ statusSentence(status, currentOrder.shipper)
          }}<span v-if="status !== 'delivered'" class="order-status-dots" aria-hidden="true"></span>
        </p>
      </HoloPanel>

      <RouteMap :order="currentOrder" :mode="MAP_MODE[status]" />

      <HoloPanel :delay="0.2">
        <InfoRow label="Shipper" badge="🛵" highlight>{{ currentOrder.shipper }}</InfoRow>
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
      <GameButton v-if="status === 'dispatching'" block :tap-sound="false" @click="handleAccept">
        <svg class="order-button-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3 20 7.5v9L12 21 4 16.5v-9Z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" />
          <path d="m8.5 12 2.5 2.5 4.5-5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        Accept order
      </GameButton>

      <GameButton v-else-if="status === 'delivering'" variant="success" block :tap-sound="false" @click="handleDelivered">
        <svg class="order-button-icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.2" />
          <path d="m7.8 12.3 2.9 2.9 5.5-6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        Confirm delivered
      </GameButton>

      <GameButton v-else variant="ghost" block @click="back">Back to orders</GameButton>
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
