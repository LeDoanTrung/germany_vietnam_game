<script setup lang="ts">
import { ref } from "vue";
import { sounds } from "../composables/useSound";

const props = withDefaults(
  defineProps<{
    /** `crayon` is the hand-drawn cartoon style used on the home poster. */
    variant?: "primary" | "ghost" | "success" | "crayon";
    block?: boolean;
    disabled?: boolean;
    /** Play the default tap sound. Off when the parent plays its own. */
    tapSound?: boolean;
    type?: "button" | "submit";
  }>(),
  { variant: "primary", block: false, disabled: false, tapSound: true, type: "button" },
);

const emit = defineEmits<{ click: [event: MouseEvent] }>();

type Ripple = { id: number; x: number; y: number; size: number };
const ripples = ref<Ripple[]>([]);
let rippleId = 0;

const handleClick = (event: MouseEvent) => {
  if (props.disabled) return;

  // Ripple grows from the exact point that was tapped.
  const button = event.currentTarget as HTMLElement;
  const rect = button.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height) * 2.2;
  const id = ++rippleId;
  ripples.value.push({ id, x: event.clientX - rect.left, y: event.clientY - rect.top, size });
  window.setTimeout(() => {
    ripples.value = ripples.value.filter((ripple) => ripple.id !== id);
  }, 650);

  if (props.tapSound) sounds.tap();
  emit("click", event);
};
</script>

<template>
  <button
    :type="props.type"
    :class="['game-button', `game-button-${props.variant}`, { 'game-button-block': props.block }]"
    :disabled="props.disabled"
    @click="handleClick"
  >
    <span
      v-for="ripple in ripples"
      :key="ripple.id"
      class="game-button-ripple"
      :style="{ left: `${ripple.x}px`, top: `${ripple.y}px`, width: `${ripple.size}px`, height: `${ripple.size}px` }"
      aria-hidden="true"
    ></span>
    <span class="game-button-content"><slot></slot></span>
  </button>
</template>

<style scoped lang="scss">
.game-button {
  --bg: var(--color-amber-400);
  --fg: #1d1200;
  --glow: rgba(255, 176, 32, 0.45);

  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 52px;
  padding: 12px 22px;
  border: none;
  border-radius: var(--radius-pill);
  background: var(--bg);
  color: var(--fg);
  font-weight: 900;
  font-size: 17px;
  letter-spacing: 0.02em;
  cursor: pointer;
  overflow: hidden;
  isolation: isolate;
  box-shadow:
    0 6px 0 rgba(0, 0, 0, 0.28),
    0 0 26px var(--glow);
  transition:
    transform 0.12s ease,
    box-shadow 0.12s ease,
    filter 0.2s ease;

  // Press: the button sinks onto its own shadow.
  &:active:not(:disabled) {
    transform: translateY(4px) scale(0.98);
    box-shadow:
      0 2px 0 rgba(0, 0, 0, 0.28),
      0 0 16px var(--glow);
  }

  @media (hover: hover) and (pointer: fine) {
    &:hover:not(:disabled) {
      filter: brightness(1.08);
    }
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  &-block {
    display: flex;
    width: 100%;
  }

  &-ghost {
    --bg: rgba(52, 191, 255, 0.12);
    --fg: var(--color-cyan-100);
    --glow: rgba(52, 191, 255, 0.18);

    border: 1px solid rgba(52, 191, 255, 0.55);
    box-shadow: 0 0 18px var(--glow);

    &:active:not(:disabled) {
      box-shadow: 0 0 10px var(--glow);
    }
  }

  &-success {
    --bg: var(--color-green-400);
    --fg: #002614;
    --glow: rgba(62, 224, 143, 0.45);
  }

  // Cartoon look: thick ink outline, hard offset shadow, slightly wonky corners.
  &-crayon {
    --bg: var(--color-poster-red);
    --fg: #fff;

    border: 3px solid var(--color-poster-ink);
    border-radius: 22px 30px 24px 32px / 30px 22px 32px 24px;
    font-family: var(--font-poster);
    font-weight: 800;
    text-shadow: 0 2px 0 rgba(31, 42, 110, 0.55);
    box-shadow: 4px 5px 0 var(--color-poster-ink);

    &:active:not(:disabled) {
      transform: translate(3px, 4px);
      box-shadow: 1px 1px 0 var(--color-poster-ink);
    }
  }

  &-content {
    position: relative;
    z-index: 1;
    display: inline-flex;
    align-items: center;
    gap: var(--space-sm);
  }

  &-ripple {
    position: absolute;
    z-index: 0;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.45);
    transform: translate(-50%, -50%) scale(0);
    animation: game-button-ripple 0.6s ease-out forwards;
    pointer-events: none;
  }
}

@keyframes game-button-ripple {
  to {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0;
  }
}
</style>
