<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import gsap from "gsap";
import { prefersReducedMotion } from "../composables/useReducedMotion";

const props = defineProps<{
  /** Index of the step in progress. Steps before it are done. */
  current: number;
}>();

const STEPS = ["Điều phối", "Nhận đơn", "Đang giao", "Đã giao"];

const fillRef = ref<HTMLElement | null>(null);

const fillTo = (index: number, from?: number) => {
  const el = fillRef.value;
  if (!el) return;
  const ratio = Math.min(index, STEPS.length - 1) / (STEPS.length - 1);

  if (prefersReducedMotion()) {
    gsap.set(el, { scaleX: ratio });
    return;
  }

  gsap.fromTo(
    el,
    { scaleX: from === undefined ? 0 : Math.min(from, STEPS.length - 1) / (STEPS.length - 1) },
    { scaleX: ratio, duration: 0.9, ease: "power2.inOut", delay: 0.2 },
  );
};

onMounted(() => fillTo(props.current));
watch(
  () => props.current,
  (next, previous) => fillTo(next, previous),
);
</script>

<template>
  <div class="stepper">
    <span class="stepper-track" aria-hidden="true">
      <span ref="fillRef" class="stepper-fill"></span>
    </span>
    <ol class="stepper-list" :aria-label="`Tiến độ: ${STEPS[Math.min(props.current, STEPS.length - 1)]}`">
    <li
      v-for="(step, index) in STEPS"
      :key="step"
      :class="[
        'stepper-step',
        { 'stepper-step-done': index < props.current, 'stepper-step-current': index === props.current },
      ]"
      :aria-current="index === props.current ? 'step' : undefined"
    >
      <span class="stepper-dot" aria-hidden="true">
        <svg v-if="index < props.current" viewBox="0 0 16 16">
          <path d="m3.5 8.5 3 3 6-7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </span>
      <span class="stepper-label">{{ step }}</span>
    </li>
    </ol>
  </div>
</template>

<style scoped lang="scss">
.stepper {
  position: relative;

  &-list {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  // Track runs between the centres of the first and last dots.
  &-track {
    position: absolute;
    top: 11px;
    left: 12.5%;
    right: 12.5%;
    height: 3px;
    border-radius: 3px;
    background: rgba(129, 216, 255, 0.18);
    overflow: hidden;
  }

  &-fill {
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, var(--color-cyan-400), var(--color-green-400));
    transform: scaleX(0);
    transform-origin: left center;
    box-shadow: 0 0 10px var(--color-cyan-400);
  }

  &-step {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    text-align: center;
  }

  &-dot {
    display: grid;
    place-items: center;
    width: 25px;
    height: 25px;
    border-radius: 50%;
    border: 2px solid rgba(129, 216, 255, 0.35);
    background: var(--color-bg-800);
    color: #002614;
    transition:
      background-color 0.4s ease,
      border-color 0.4s ease;

    svg {
      width: 14px;
      height: 14px;
    }
  }

  &-label {
    font-size: 12px;
    font-weight: 700;
    color: var(--color-text-500);
    transition: color 0.4s ease;
  }

  &-step-done &-dot {
    border-color: var(--color-green-400);
    background: var(--color-green-400);
  }

  &-step-done &-label {
    color: var(--color-text-300);
  }

  &-step-current &-dot {
    border-color: var(--color-amber-400);
    background: var(--color-bg-800);
    box-shadow: 0 0 0 0 rgba(255, 176, 32, 0.6);
    animation: stepper-pulse 1.5s ease-out infinite;

    &::after {
      content: "";
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: var(--color-amber-400);
    }
  }

  &-step-current &-label {
    color: var(--color-amber-300);
  }
}

@keyframes stepper-pulse {
  70% {
    box-shadow: 0 0 0 10px rgba(255, 176, 32, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(255, 176, 32, 0);
  }
}
</style>
