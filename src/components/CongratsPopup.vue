<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from "vue";
import gsap from "gsap";
import HoloPanel from "./HoloPanel.vue";
import ScrambleText from "./ScrambleText.vue";
import ConfettiBurst from "./ConfettiBurst.vue";
import GameButton from "./GameButton.vue";
import { formatVnd } from "../config/game";
import { useGame } from "../store/game";
import { prefersReducedMotion } from "../composables/useReducedMotion";

const { state, currentOrder, pendingOrders, go, closeCongrats } = useGame();

const primaryRef = ref<InstanceType<typeof GameButton> | null>(null);

// The reward ticks up from zero, like a payout counter.
const shownReward = ref(0);
let tween: gsap.core.Tween | null = null;

const countUp = (reward: number) => {
  tween?.kill();
  if (prefersReducedMotion()) {
    shownReward.value = reward;
    return;
  }
  shownReward.value = 0;
  const counter = { value: 0 };
  tween = gsap.to(counter, {
    value: reward,
    duration: 1.2,
    delay: 0.6,
    ease: "power2.out",
    // Whole thousands, so the last digits don't flicker.
    onUpdate: () => {
      shownReward.value = Math.round(counter.value / 1000) * 1000;
    },
  });
};

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === "Escape") closeCongrats();
};

watch(
  () => state.congratsOpen,
  async (open) => {
    if (open) {
      countUp(currentOrder.value?.reward ?? 0);
      window.addEventListener("keydown", handleKeydown);
      await nextTick();
      (primaryRef.value?.$el as HTMLElement | undefined)?.focus();
    } else {
      window.removeEventListener("keydown", handleKeydown);
    }
  },
);

onBeforeUnmount(() => {
  tween?.kill();
  window.removeEventListener("keydown", handleKeydown);
});
</script>

<template>
  <Transition name="congrats">
    <div
      v-if="state.congratsOpen && currentOrder"
      class="congrats"
      role="dialog"
      aria-modal="true"
      aria-labelledby="congrats-title"
    >
      <ConfettiBurst />

      <HoloPanel tone="green" class="congrats-card">
        <div class="congrats-check" aria-hidden="true">
          <svg viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" class="congrats-check-circle" />
            <path d="m38 62 15 15 30-33" class="congrats-check-mark" />
          </svg>
        </div>

        <ScrambleText id="congrats-title" text="Congratulations!" as="h2" class="congrats-title" :delay="0.3" />
        <p class="congrats-copy">
          <strong>{{ currentOrder.shipper }}</strong> đã giao thành công Đơn {{ currentOrder.number }} —
          {{ currentOrder.item }} đến {{ currentOrder.to.name }}.
        </p>

        <div class="congrats-reward">
          <p class="congrats-reward-label">Phí ship nhận được</p>
          <p class="congrats-reward-value mono" :aria-label="formatVnd(currentOrder.reward)">+{{ formatVnd(shownReward) }}</p>
        </div>

        <div class="congrats-actions">
          <GameButton ref="primaryRef" block @click="go('orders', null)">
            {{ pendingOrders.length > 0 ? `Về danh sách đơn (${pendingOrders.length} còn lại)` : "Về danh sách đơn" }}
          </GameButton>
          <GameButton variant="ghost" block @click="go('home', null)">Về màn hình chính</GameButton>
        </div>
      </HoloPanel>
    </div>
  </Transition>
</template>

<style scoped lang="scss">
.congrats {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: grid;
  place-items: center;
  padding: var(--space-md);
  background: rgba(2, 10, 28, 0.72);
  -webkit-backdrop-filter: blur(6px); // iOS Safari < 18
  backdrop-filter: blur(6px);

  // Doubled class so the padding wins over HoloPanel's own.
  &-card.holo-panel {
    position: relative;
    // Below the confetti (z 5), so the paper falls in front of the card.
    z-index: 4;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-sm);
    width: 100%;
    max-width: 360px;
    padding: var(--space-lg) var(--space-md) var(--space-md);
    text-align: center;
  }

  &-check {
    width: 104px;
    height: 104px;
    animation: congrats-pop 0.6s var(--ease-out-back) 0.1s both;

    svg {
      width: 100%;
      height: 100%;
      filter: drop-shadow(0 0 18px rgba(62, 224, 143, 0.65));
    }

    &-circle {
      fill: rgba(62, 224, 143, 0.12);
      stroke: var(--color-green-400);
      stroke-width: 5;
      stroke-dasharray: 327;
      stroke-dashoffset: 327;
      animation: congrats-draw 0.7s ease-out 0.2s forwards;
    }

    &-mark {
      fill: none;
      stroke: var(--color-green-400);
      stroke-width: 8;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-dasharray: 80;
      stroke-dashoffset: 80;
      animation: congrats-draw 0.45s ease-out 0.75s forwards;
    }
  }

  &-title {
    font-size: 30px;
    font-weight: 900;
    background: linear-gradient(180deg, #ffffff 30%, var(--color-green-400));
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }

  &-copy {
    color: var(--color-text-300);

    strong {
      color: var(--color-amber-300);
    }
  }

  &-reward {
    width: 100%;
    padding: var(--space-sm);
    border-radius: var(--radius-sm);
    background: rgba(62, 224, 143, 0.1);

    &-label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--color-text-300);
    }

    &-value {
      margin-top: 2px;
      font-size: 30px;
      font-weight: 700;
      color: var(--color-green-400);
      text-shadow: 0 0 18px rgba(62, 224, 143, 0.5);
    }
  }

  &-actions {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    width: 100%;
    margin-top: var(--space-xs);
  }
}

// Card springs up from below while the backdrop fades in.
.congrats-enter-active {
  transition: opacity 0.25s ease;

  .congrats-card {
    transition: transform 0.55s var(--ease-out-back);
  }
}

.congrats-leave-active {
  transition: opacity 0.2s ease;
}

.congrats-enter-from,
.congrats-leave-to {
  opacity: 0;
}

.congrats-enter-from .congrats-card {
  transform: translateY(40px) scale(0.9);
}

@media (prefers-reduced-motion: reduce) {
  .congrats-check,
  .congrats-check-circle,
  .congrats-check-mark {
    animation: none;
    stroke-dashoffset: 0;
  }
}

@keyframes congrats-draw {
  to {
    stroke-dashoffset: 0;
  }
}

@keyframes congrats-pop {
  from {
    transform: scale(0.4);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
