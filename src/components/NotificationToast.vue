<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import gsap from "gsap";
import { sounds } from "../composables/useSound";
import { prefersReducedMotion } from "../composables/useReducedMotion";

const props = withDefaults(
  defineProps<{
    appName: string;
    title: string;
    message: string;
    badge?: number;
    delay?: number;
  }>(),
  { badge: 0, delay: 0 },
);

const emit = defineEmits<{ open: [] }>();

const toastRef = ref<HTMLButtonElement | null>(null);
let timeline: gsap.core.Timeline | null = null;

onMounted(() => {
  const el = toastRef.value;
  if (!el) return;

  if (prefersReducedMotion()) {
    gsap.set(el, { autoAlpha: 1 });
    window.setTimeout(sounds.notify, props.delay * 1000);
    return;
  }

  // Drop in with an overshoot, then nudge every few seconds until tapped.
  timeline = gsap
    .timeline({ delay: props.delay })
    .fromTo(
      el,
      { autoAlpha: 0, y: -120, scale: 0.92 },
      { autoAlpha: 1, y: 0, scale: 1, duration: 0.7, ease: "back.out(1.8)", onStart: sounds.notify },
    )
    .to(el, {
      keyframes: { rotation: [0, -2.5, 2.5, -1.5, 1.5, 0] },
      duration: 0.5,
      ease: "none",
      repeat: -1,
      repeatDelay: 2.6,
    });
});

onBeforeUnmount(() => timeline?.kill());

const handleOpen = () => {
  sounds.tap();
  emit("open");
};
</script>

<template>
  <button ref="toastRef" type="button" class="toast" aria-live="polite" @click="handleOpen">
    <span class="toast-icon" aria-hidden="true">
      <svg viewBox="0 0 32 32">
        <path d="M16 4 27 10v12L16 28 5 22V10Z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" />
        <path d="M5 10 16 16l11-6M16 16v12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" />
      </svg>
      <span v-if="props.badge > 0" class="toast-badge">{{ props.badge }}</span>
    </span>

    <span class="toast-body">
      <span class="toast-meta">
        <span class="toast-app">{{ props.appName }}</span>
        <span class="toast-time">now</span>
      </span>
      <span class="toast-title">{{ props.title }}</span>
      <span class="toast-message">{{ props.message }}</span>
    </span>

    <span class="toast-chevron" aria-hidden="true"></span>
  </button>
</template>

<style scoped lang="scss">
.toast {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  width: 100%;
  padding: 12px 14px;
  border: 1px solid rgba(129, 216, 255, 0.35);
  border-radius: var(--radius-lg);
  background: rgba(10, 30, 66, 0.9);
  -webkit-backdrop-filter: blur(14px); // iOS Safari < 18
  backdrop-filter: blur(14px);
  // Explicit, so it stays readable on the light poster home as well.
  color: var(--color-text-100);
  box-shadow:
    0 18px 40px rgba(0, 0, 0, 0.45),
    0 0 30px rgba(52, 191, 255, 0.18);
  text-align: left;
  cursor: pointer;
  visibility: hidden;
  transform-origin: 50% 0%;
  transition: border-color 0.2s ease;

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      border-color: var(--color-cyan-400);
    }
  }

  &:active {
    filter: brightness(1.15);
  }

  &-icon {
    position: relative;
    flex-shrink: 0;
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: linear-gradient(145deg, var(--color-cyan-400), #0a6fd6);
    color: #fff;

    svg {
      width: 26px;
      height: 26px;
    }
  }

  &-badge {
    position: absolute;
    top: -7px;
    right: -7px;
    display: grid;
    place-items: center;
    min-width: 22px;
    height: 22px;
    padding: 0 6px;
    border-radius: var(--radius-pill);
    border: 2px solid var(--color-bg-800);
    background: var(--color-red-400);
    font-size: 12px;
    font-weight: 900;
    animation: toast-badge-pulse 1.6s ease-in-out infinite;
  }

  &-body {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    flex: 1;
  }

  &-meta {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: var(--color-text-300);
  }

  &-app {
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  &-title {
    font-weight: 900;
    font-size: 16px;
  }

  &-message {
    font-size: 14px;
    color: var(--color-text-300);
  }

  &-chevron {
    flex-shrink: 0;
    width: 9px;
    height: 9px;
    border-top: 2px solid var(--color-cyan-300);
    border-right: 2px solid var(--color-cyan-300);
    transform: rotate(45deg);
    margin-right: 4px;
  }
}

@keyframes toast-badge-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(255, 93, 108, 0.6);
  }
  50% {
    box-shadow: 0 0 0 7px rgba(255, 93, 108, 0);
  }
}
</style>
