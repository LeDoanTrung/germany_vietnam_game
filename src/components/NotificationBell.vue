<script setup lang="ts">
import { onMounted } from "vue";
import { sounds } from "../composables/useSound";

const props = withDefaults(
  defineProps<{
    count: number;
    /** `paper` suits the light hand-drawn home poster. */
    variant?: "holo" | "paper";
  }>(),
  { variant: "holo" },
);
const emit = defineEmits<{ open: [] }>();

// Ring once when the bell appears (it follows a tap on Start, so audio is allowed).
onMounted(() => sounds.notify());

const handleClick = () => {
  sounds.tap();
  emit("open");
};
</script>

<template>
  <button
    type="button"
    :class="['bell', `bell-${props.variant}`]"
    :aria-label="`${props.count} new notifications`"
    @click="handleClick"
  >
    <span class="bell-wave" aria-hidden="true"></span>
    <span class="bell-wave bell-wave-late" aria-hidden="true"></span>
    <span class="bell-body" aria-hidden="true">
      <svg viewBox="0 0 48 48">
        <path
          d="M24 6c-7 0-12 5.4-12 12.4v7.4L8.6 31.6c-.8 1.4.2 3 1.8 3h27.2c1.6 0 2.6-1.6 1.8-3L36 25.8v-7.4C36 11.4 31 6 24 6Z"
          class="bell-shell"
        />
        <path d="M19.5 38.5a4.6 4.6 0 0 0 9 0" class="bell-clapper" />
      </svg>
    </span>
    <span class="bell-badge">{{ props.count }}</span>
  </button>
</template>

<style scoped lang="scss">
.bell {
  position: relative;
  display: grid;
  place-items: center;
  width: 108px;
  height: 108px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(52, 191, 255, 0.28), rgba(52, 191, 255, 0.06) 70%);
  cursor: pointer;
  animation: bell-pop 0.6s var(--ease-out-back) both;

  &:active {
    transform: scale(0.94);
  }

  // Waves ripple out from the bell, like a phone ringing.
  &-wave {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border: 2px solid var(--color-cyan-400);
    opacity: 0;
    animation: bell-wave 2s ease-out infinite;

    &-late {
      animation-delay: 1s;
    }
  }

  // "Rung rung": a sharp shake, then a rest, on repeat.
  &-body {
    display: grid;
    place-items: center;
    width: 64px;
    height: 64px;
    transform-origin: 50% 12%;
    animation: bell-shake 1.8s ease-in-out infinite;

    svg {
      width: 100%;
      height: 100%;
      filter: drop-shadow(0 0 14px rgba(52, 191, 255, 0.75));
    }
  }

  &-shell {
    fill: rgba(52, 191, 255, 0.22);
    stroke: var(--color-cyan-300);
    stroke-width: 2.6;
    stroke-linejoin: round;
  }

  &-clapper {
    fill: none;
    stroke: var(--color-amber-400);
    stroke-width: 3;
    stroke-linecap: round;
  }

  &-badge {
    position: absolute;
    top: 14px;
    right: 14px;
    display: grid;
    place-items: center;
    min-width: 30px;
    height: 30px;
    padding: 0 8px;
    border-radius: var(--radius-pill);
    border: 3px solid var(--color-bg-800);
    background: var(--color-red-400);
    color: #fff;
    font-size: 15px;
    font-weight: 900;
    animation: bell-badge 1.8s ease-in-out infinite;
  }

  &-paper {
    background: radial-gradient(circle, rgba(255, 210, 63, 0.45), rgba(255, 210, 63, 0.08) 70%);

    .bell-wave {
      border-color: var(--color-poster-blue);
    }

    .bell-body svg {
      filter: drop-shadow(3px 4px 0 var(--color-poster-ink));
    }

    .bell-shell {
      fill: var(--color-poster-yellow);
      stroke: var(--color-poster-ink);
      stroke-width: 3;
    }

    .bell-clapper {
      stroke: var(--color-poster-red);
    }

    .bell-badge {
      border-color: var(--color-poster-ink);
      background: var(--color-poster-red);
    }
  }
}

@keyframes bell-pop {
  from {
    transform: scale(0.3);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes bell-wave {
  from {
    transform: scale(0.8);
    opacity: 0.8;
  }
  to {
    transform: scale(1.6);
    opacity: 0;
  }
}

@keyframes bell-shake {
  0%,
  45%,
  100% {
    transform: rotate(0);
  }
  5% {
    transform: rotate(-18deg);
  }
  10% {
    transform: rotate(16deg);
  }
  15% {
    transform: rotate(-14deg);
  }
  20% {
    transform: rotate(12deg);
  }
  25% {
    transform: rotate(-8deg);
  }
  30% {
    transform: rotate(6deg);
  }
  35% {
    transform: rotate(-3deg);
  }
}

@keyframes bell-badge {
  0%,
  45%,
  100% {
    transform: scale(1);
  }
  10% {
    transform: scale(1.18);
  }
}
</style>
