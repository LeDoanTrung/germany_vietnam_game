<script setup lang="ts">
import { connectClaims, useGame } from "../store/game";

// Short messages ("Too late — someone just took this order") and the
// connection banner, pinned to the bottom of the phone frame.
const { state } = useGame();

const retry = () => void connectClaims();
</script>

<template>
  <div class="snackbar-area" aria-live="polite">
    <Transition name="snackbar">
      <p v-if="state.backend === 'error'" class="snackbar snackbar-error">
        Can't reach the order service — check your internet.
        <button type="button" class="snackbar-action" @click="retry">Retry</button>
      </p>
      <p v-else-if="state.notice" :key="state.notice" class="snackbar">{{ state.notice }}</p>
    </Transition>
  </div>
</template>

<style scoped lang="scss">
.snackbar-area {
  position: absolute;
  left: var(--space-md);
  right: var(--space-md);
  // Clear of the action bar's button.
  bottom: calc(96px + env(safe-area-inset-bottom));
  z-index: 30;
  display: flex;
  justify-content: center;
  pointer-events: none;
}

.snackbar {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: 12px 16px;
  border-radius: var(--radius-md);
  border: 1px solid rgba(255, 176, 32, 0.6);
  background: rgba(10, 30, 66, 0.96);
  -webkit-backdrop-filter: blur(10px); // iOS Safari < 18
  backdrop-filter: blur(10px);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.45);
  color: var(--color-text-100);
  font-size: 14px;
  font-weight: 700;
  pointer-events: auto;

  &-error {
    border-color: var(--color-red-400);
  }

  &-action {
    flex-shrink: 0;
    min-height: 36px;
    padding: 6px 14px;
    border: none;
    border-radius: var(--radius-pill);
    background: var(--color-red-400);
    color: #fff;
    font-weight: 900;
    cursor: pointer;
  }
}

.snackbar-enter-active,
.snackbar-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.3s var(--ease-out-back);
}

.snackbar-enter-from,
.snackbar-leave-to {
  opacity: 0;
  transform: translateY(16px);
}
</style>
