<script setup lang="ts">
import { onBeforeUnmount, ref } from "vue";
import AppHeader from "../components/AppHeader.vue";
import HoloPanel from "../components/HoloPanel.vue";
import StatusBadge from "../components/StatusBadge.vue";
import GameButton from "../components/GameButton.vue";
import { ORDERS, formatVnd } from "../config/game";
import { STATUS_TONE, statusSentence } from "../config/status";
import { statusOf, useGame } from "../store/game";
import { sounds } from "../composables/useSound";
import { prefersReducedMotion } from "../composables/useReducedMotion";

const { pendingOrders, earnings, back, openOrder } = useGame();

const handleOpen = (id: string) => {
  if (drawing.value) return;
  sounds.tap();
  openOrder(id);
};

// Random draw — a highlight hops between the open orders, slowing down like a
// prize wheel, and lands on one at random.
const drawing = ref(false);
const highlightedId = ref<string | null>(null);
const cardRefs = new Map<string, HTMLElement>();
const timers: number[] = [];

const setCardRef = (id: string, el: unknown) => {
  const node = (el as { $el?: HTMLElement } | null)?.$el;
  if (node) cardRefs.set(id, node);
};

const highlight = (id: string) => {
  highlightedId.value = id;
  cardRefs.get(id)?.scrollIntoView({ block: "nearest", behavior: prefersReducedMotion() ? "auto" : "smooth" });
};

const drawRandom = () => {
  const candidates = pendingOrders.value.map((order) => order.id);
  if (drawing.value || candidates.length === 0) return;

  drawing.value = true;
  const winner = candidates[Math.floor(Math.random() * candidates.length)]!;
  const hops = prefersReducedMotion() ? 0 : 14;

  let elapsed = 0;
  for (let hop = 0; hop < hops; hop++) {
    elapsed += 60 + hop * hop * 2.2; // each hop a little slower than the last
    const id = candidates[Math.floor(Math.random() * candidates.length)]!;
    timers.push(
      window.setTimeout(() => {
        highlight(id);
        sounds.tap();
      }, elapsed),
    );
  }

  timers.push(
    window.setTimeout(() => {
      highlight(winner);
      sounds.confirm();
    }, elapsed + 220),
  );

  timers.push(
    window.setTimeout(() => {
      drawing.value = false;
      highlightedId.value = null;
      openOrder(winner);
    }, elapsed + 1100),
  );
};

onBeforeUnmount(() => timers.forEach((timer) => window.clearTimeout(timer)));
</script>

<template>
  <div class="orders">
    <AppHeader :title="`Orders (${ORDERS.length})`" show-back :earnings="earnings" @back="back" />

    <div class="orders-intro">
      <p class="orders-intro-copy">
        Find the order with your name — or let the app draw one. <b>{{ pendingOrders.length }}</b> orders left to handle.
      </p>
      <GameButton
        variant="ghost"
        block
        :disabled="drawing || pendingOrders.length === 0"
        :tap-sound="false"
        @click="drawRandom"
      >
        <svg class="orders-dice" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3.5" y="3.5" width="17" height="17" rx="4" fill="none" stroke="currentColor" stroke-width="2" />
          <circle cx="8.5" cy="8.5" r="1.6" fill="currentColor" />
          <circle cx="15.5" cy="15.5" r="1.6" fill="currentColor" />
          <circle cx="12" cy="12" r="1.6" fill="currentColor" />
        </svg>
        {{ drawing ? "Drawing..." : "Random draw" }}
      </GameButton>
    </div>

    <ul class="orders-list">
      <HoloPanel
        v-for="(order, index) in ORDERS"
        :key="order.id"
        :ref="(el) => setCardRef(order.id, el)"
        as="li"
        flush
        :tone="highlightedId === order.id ? 'amber' : STATUS_TONE[statusOf(order.id)]"
        :delay="0.1 + Math.min(index, 6) * 0.08"
        :class="[
          'orders-card',
          {
            'orders-card-done': statusOf(order.id) === 'delivered',
            'orders-card-highlight': highlightedId === order.id,
          },
        ]"
      >
        <button type="button" class="orders-card-button" :disabled="drawing" @click="handleOpen(order.id)">
          <span class="orders-card-top">
            <span class="orders-card-number">Order {{ order.number }}</span>
            <StatusBadge :status="statusOf(order.id)" />
          </span>

          <span class="orders-card-shipper">
            <span class="orders-card-avatar" aria-hidden="true">{{ order.shipper.charAt(0) }}</span>
            <span>
              <span class="orders-card-shipper-label">Status</span>
              <span class="orders-card-shipper-name">{{ statusSentence(statusOf(order.id), order.shipper) }}</span>
            </span>
          </span>

          <span class="orders-card-item">{{ order.item }} <small>× {{ order.quantity }}</small></span>

          <span class="orders-card-route">
            <span class="orders-card-stop mono">{{ order.from.label }}</span>
            <span class="orders-card-line" aria-hidden="true"></span>
            <span class="orders-card-stop orders-card-stop-end mono">{{ order.to.label }}</span>
          </span>
          <span class="orders-card-places">
            <span>{{ order.from.name }}</span>
            <span>{{ order.to.name }}</span>
          </span>

          <span class="orders-card-bottom">
            <span class="orders-card-distance">{{ order.distanceKm }} km</span>
            <span class="orders-card-reward mono">+{{ formatVnd(order.reward) }}</span>
          </span>
        </button>
      </HoloPanel>
    </ul>
  </div>
</template>

<style scoped lang="scss">
.orders {
  display: flex;
  flex-direction: column;
  min-height: 100%;

  &-intro {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    padding: var(--space-xs) var(--space-md) var(--space-sm);

    &-copy {
      font-size: 14px;
      color: var(--color-text-300);

      b {
        color: var(--color-amber-300);
      }
    }
  }

  &-dice {
    width: 20px;
    height: 20px;
  }

  &-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    padding: var(--space-sm) var(--space-md) var(--space-xl);
  }

  &-card {
    transition:
      transform 0.15s ease,
      box-shadow 0.15s ease;

    &:active {
      transform: scale(0.985);
    }

    &-done {
      opacity: 0.62;
    }

    // The card the draw is currently landing on. Doubled class so it beats
    // HoloPanel's own box-shadow regardless of stylesheet order.
    &.orders-card-highlight {
      transform: scale(1.025);
      box-shadow:
        0 0 0 2px var(--color-amber-400),
        0 0 36px rgba(255, 176, 32, 0.55);
    }

    &-button {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm);
      width: 100%;
      padding: var(--space-md);
      border: none;
      background: none;
      text-align: left;
      cursor: pointer;

      &:disabled {
        cursor: default;
      }
    }

    &-top,
    &-bottom {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-sm);
    }

    &-number {
      font-size: 14px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--color-cyan-300);
    }

    &-shipper {
      display: flex;
      align-items: center;
      gap: var(--space-sm);

      &-label {
        display: block;
        font-size: 12px;
        color: var(--color-text-300);
      }

      &-name {
        display: block;
        font-size: 17px;
        font-weight: 900;
        line-height: 1.2;
      }
    }

    &-avatar {
      display: grid;
      place-items: center;
      flex-shrink: 0;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(145deg, var(--color-amber-400), #e07a00);
      color: #1d1200;
      font-size: 18px;
      font-weight: 900;
    }

    &-item {
      font-size: 15px;
      font-weight: 700;
      color: var(--color-text-300);

      small {
        font-size: 13px;
      }
    }

    &-route {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    &-stop {
      display: grid;
      place-items: center;
      flex-shrink: 0;
      width: 26px;
      height: 26px;
      border-radius: 50%;
      border: 1.5px solid var(--color-cyan-400);
      font-size: 12px;
      font-weight: 700;

      &-end {
        border-color: var(--color-amber-400);
      }
    }

    &-places {
      display: flex;
      justify-content: space-between;
      gap: var(--space-sm);
      margin-top: -4px;
      font-size: 12px;
      color: var(--color-text-300);

      span:last-child {
        text-align: right;
      }
    }

    // Dashes drift along the route to suggest movement.
    &-line {
      flex: 1;
      height: 2px;
      background: repeating-linear-gradient(90deg, rgba(129, 216, 255, 0.6) 0 6px, transparent 6px 11px);
      background-size: 22px 2px;
      animation: orders-dash 0.9s linear infinite;
    }

    &-distance {
      font-size: 13px;
      color: var(--color-text-300);
    }

    &-reward {
      font-size: 15px;
      font-weight: 700;
      color: var(--color-amber-300);
    }
  }
}

@keyframes orders-dash {
  to {
    background-position: 22px 0;
  }
}
</style>
