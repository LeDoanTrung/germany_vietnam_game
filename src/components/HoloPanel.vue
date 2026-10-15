<script setup lang="ts">
import { onMounted, ref } from "vue";
import gsap from "gsap";
import { prefersReducedMotion } from "../composables/useReducedMotion";

const props = withDefaults(
  defineProps<{
    /** Seconds to wait before the panel scans in. */
    delay?: number;
    tone?: "cyan" | "amber" | "green";
    as?: string;
    /** Drop the inner padding, e.g. when the content is a full-size button. */
    flush?: boolean;
  }>(),
  { delay: 0, tone: "cyan", as: "div", flush: false },
);

const panelRef = ref<HTMLElement | null>(null);

onMounted(() => {
  const el = panelRef.value;
  if (!el || prefersReducedMotion()) return;

  // Scan in from left to right, then flicker like a projector warming up.
  gsap
    .timeline({ delay: props.delay })
    .fromTo(el, { clipPath: "inset(0% 100% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.42, ease: "power2.out" })
    .to(el, { keyframes: { opacity: [0.35, 1, 0.55, 1, 0.8, 1] }, duration: 0.36, ease: "none" }, 0.1)
    // Hand opacity back to CSS so classes like a dimmed "done" state still apply.
    .set(el, { clearProps: "clipPath,opacity" });
});
</script>

<template>
  <component
    :is="props.as"
    ref="panelRef"
    :class="['holo-panel', `holo-panel-${props.tone}`, { 'holo-panel-flush': props.flush }]"
  >
    <span class="holo-panel-corner holo-panel-corner-tl" aria-hidden="true"></span>
    <span class="holo-panel-corner holo-panel-corner-br" aria-hidden="true"></span>
    <slot></slot>
  </component>
</template>

<style scoped lang="scss">
.holo-panel {
  --tone: var(--color-cyan-400);
  --tone-soft: rgba(52, 191, 255, 0.22);

  position: relative;
  padding: var(--space-md);
  border-radius: var(--radius-md);
  border: 1px solid var(--tone);
  background: linear-gradient(180deg, var(--color-panel-top) 0%, var(--color-panel-bottom) 100%);
  box-shadow:
    0 0 24px var(--tone-soft),
    inset 0 0 18px rgba(52, 191, 255, 0.08);
  overflow: hidden;
  isolation: isolate;

  // Moving scanlines give the "projected" feel.
  &::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: -1;
    background: repeating-linear-gradient(180deg, rgba(129, 216, 255, 0.06) 0 1px, transparent 1px 4px);
    animation: holo-scan 6s linear infinite;
    pointer-events: none;
  }

  // A slow sweep of light across the panel.
  &::after {
    content: "";
    position: absolute;
    inset: -40% -60%;
    z-index: -1;
    background: linear-gradient(105deg, transparent 42%, rgba(129, 216, 255, 0.12) 50%, transparent 58%);
    animation: holo-sweep 5.5s ease-in-out infinite;
    pointer-events: none;
  }

  &-flush {
    padding: 0;
  }

  &-amber {
    --tone: var(--color-amber-400);
    --tone-soft: rgba(255, 176, 32, 0.22);
  }

  &-green {
    --tone: var(--color-green-400);
    --tone-soft: rgba(62, 224, 143, 0.22);
  }

  &-corner {
    position: absolute;
    width: 12px;
    height: 12px;
    border-color: var(--tone);
    border-style: solid;
    pointer-events: none;

    &-tl {
      top: 5px;
      left: 5px;
      border-width: 2px 0 0 2px;
      border-top-left-radius: 4px;
    }

    &-br {
      right: 5px;
      bottom: 5px;
      border-width: 0 2px 2px 0;
      border-bottom-right-radius: 4px;
    }
  }
}

@keyframes holo-scan {
  to {
    background-position: 0 40px;
  }
}

@keyframes holo-sweep {
  0%,
  35% {
    transform: translateX(-60%);
  }
  65%,
  100% {
    transform: translateX(60%);
  }
}
</style>
