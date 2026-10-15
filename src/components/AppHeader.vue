<script setup lang="ts">
import { muted, sounds, toggleMuted } from "../composables/useSound";
import { formatVnd } from "../config/game";

const props = withDefaults(
  defineProps<{
    title?: string;
    showBack?: boolean;
    earnings?: number;
    /** `paper` for the light home poster. */
    tone?: "holo" | "paper";
  }>(),
  { title: "", showBack: false, earnings: 0, tone: "holo" },
);

const emit = defineEmits<{ back: [] }>();

const handleBack = () => {
  sounds.tap();
  emit("back");
};
</script>

<template>
  <header :class="['app-header', `app-header-${props.tone}`]">
    <button v-if="props.showBack" type="button" class="app-header-icon" aria-label="Back" @click="handleBack">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M15 5 8 12l7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>
    <span v-else class="app-header-spacer" aria-hidden="true"></span>

    <h1 v-if="props.title" class="app-header-title">{{ props.title }}</h1>
    <span v-else class="app-header-title" aria-hidden="true"></span>

    <span class="app-header-wallet mono" :aria-label="`Shift earnings: ${formatVnd(props.earnings)}`">
      {{ formatVnd(props.earnings) }}
    </span>

    <button
      type="button"
      class="app-header-icon"
      :aria-label="muted ? 'Turn sound on' : 'Turn sound off'"
      :aria-pressed="!muted"
      @click="toggleMuted"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" />
        <template v-if="!muted">
          <path d="M15.5 9a4 4 0 0 1 0 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          <path d="M18 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </template>
        <path v-else d="m16 9.5 5 5m0-5-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      </svg>
    </button>
  </header>
</template>

<style scoped lang="scss">
.app-header {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  padding-top: max(var(--space-sm), env(safe-area-inset-top));

  &-icon,
  &-spacer {
    flex-shrink: 0;
    width: 40px;
    height: 40px;
  }

  &-icon {
    display: grid;
    place-items: center;
    border: 1px solid rgba(52, 191, 255, 0.4);
    border-radius: 50%;
    background: rgba(52, 191, 255, 0.1);
    color: var(--color-cyan-100);
    cursor: pointer;
    transition:
      background-color 0.2s ease,
      transform 0.12s ease;

    &:active {
      transform: scale(0.92);
    }

    @media (hover: hover) and (pointer: fine) {
      &:hover {
        background: rgba(52, 191, 255, 0.24);
      }
    }

    svg {
      width: 20px;
      height: 20px;
    }
  }

  &-title {
    flex: 1;
    min-width: 0;
    font-size: 18px;
    font-weight: 900;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &-paper &-icon {
    border: 2px solid var(--color-poster-ink);
    background: #fff;
    color: var(--color-poster-ink);
    box-shadow: 2px 3px 0 var(--color-poster-ink);
  }

  &-paper &-wallet {
    border: 2px solid var(--color-poster-ink);
    background: var(--color-poster-yellow);
    color: var(--color-poster-ink);
  }

  &-wallet {
    flex-shrink: 0;
    padding: 6px 10px;
    border-radius: var(--radius-pill);
    background: rgba(255, 176, 32, 0.14);
    border: 1px solid rgba(255, 176, 32, 0.45);
    color: var(--color-amber-300);
    font-size: 13px;
    font-weight: 700;
  }
}
</style>
