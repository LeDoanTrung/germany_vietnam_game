<template>
  <div class="action-bar">
    <slot></slot>
  </div>
</template>

<style scoped lang="scss">
// Pinned to the bottom of the screen, within thumb reach, fading the content
// that scrolls beneath it.
.action-bar {
  position: sticky;
  bottom: 0;
  z-index: 4;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  margin-top: auto;
  padding: var(--space-lg) var(--space-md) var(--space-md);
  padding-bottom: max(var(--space-md), env(safe-area-inset-bottom));
  background: linear-gradient(180deg, transparent, var(--color-bg-800) 38%);
}
</style>
