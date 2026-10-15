<script setup lang="ts">
import type { OrderStatus } from "../store/game";
import { STATUS_LABEL, STATUS_TONE } from "../config/status";

const props = defineProps<{ status: OrderStatus }>();
</script>

<template>
  <span :class="['status-badge', `status-badge-${STATUS_TONE[props.status]}`]">
    <span class="status-badge-dot" aria-hidden="true"></span>
    {{ STATUS_LABEL[props.status] }}
  </span>
</template>

<style scoped lang="scss">
.status-badge {
  --tone: var(--color-cyan-400);

  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: var(--radius-pill);
  // Plain fallbacks first: color-mix needs iOS 16.2+.
  border: 1px solid var(--tone);
  border: 1px solid color-mix(in srgb, var(--tone) 60%, transparent);
  background: rgba(255, 255, 255, 0.06);
  background: color-mix(in srgb, var(--tone) 14%, transparent);
  color: var(--tone);
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;

  &-amber {
    --tone: var(--color-amber-400);
  }

  &-green {
    --tone: var(--color-green-400);
  }

  &-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: currentColor;
    box-shadow: 0 0 8px currentColor;
    animation: status-badge-blink 1.4s ease-in-out infinite;
  }

  &-green &-dot {
    animation: none;
  }
}

@keyframes status-badge-blink {
  50% {
    opacity: 0.3;
  }
}
</style>
