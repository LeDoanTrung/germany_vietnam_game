<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    label: string;
    /** Single letter badge, e.g. the route stop "A". */
    badge?: string;
    highlight?: boolean;
  }>(),
  { badge: "", highlight: false },
);
</script>

<template>
  <div :class="['info-row', { 'info-row-highlight': props.highlight }]">
    <span v-if="props.badge" class="info-row-badge mono" aria-hidden="true">{{ props.badge }}</span>
    <div class="info-row-body">
      <p class="info-row-label">{{ props.label }}</p>
      <div class="info-row-value"><slot></slot></div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.info-row {
  display: flex;
  align-items: flex-start;
  gap: var(--space-sm);
  padding: var(--space-sm) 0;

  & + & {
    border-top: 1px solid rgba(52, 191, 255, 0.16);
  }

  &-badge {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    border: 1.5px solid var(--color-cyan-400);
    font-size: 13px;
    font-weight: 700;
    color: var(--color-cyan-100);
  }

  &-label {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-text-300);
  }

  &-value {
    margin-top: 2px;
    font-size: 15px;
    font-weight: 700;

    :deep(small) {
      display: block;
      font-size: 13px;
      font-weight: 400;
      color: var(--color-text-300);
    }
  }

  &-highlight &-badge {
    border-color: var(--color-amber-400);
    background: rgba(255, 176, 32, 0.16);
    color: var(--color-amber-300);
  }

  &-highlight &-label {
    color: var(--color-amber-300);
  }
}
</style>
