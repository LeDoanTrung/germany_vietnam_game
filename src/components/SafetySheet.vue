<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import HoloPanel from "./HoloPanel.vue";
import GameButton from "./GameButton.vue";

// Shown once per phone, right after taking an order: how to ride safely and
// keep the game working (screen on, battery, data).

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: [] }>();

const okRef = ref<InstanceType<typeof GameButton> | null>(null);

watch(
  () => props.open,
  async (open) => {
    if (!open) return;
    await nextTick();
    (okRef.value?.$el as HTMLElement | undefined)?.focus();
  },
);
</script>

<template>
  <Transition name="sheet">
    <div v-if="props.open" class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
      <HoloPanel tone="amber" class="sheet-card">
        <h2 id="sheet-title" class="sheet-title">Before you ride 🛵</h2>
        <ul class="sheet-list">
          <li><span aria-hidden="true">🙋</span><span><b>The passenger holds the phone.</b> Drivers: only look when stopped.</span></li>
          <li><span aria-hidden="true">📱</span><span><b>Keep this screen open.</b> Phones pause GPS when the screen locks.</span></li>
          <li><span aria-hidden="true">🔋</span><span><b>GPS uses battery.</b> Start charged, or bring a power bank.</span></li>
          <li><span aria-hidden="true">📶</span><span><b>You need internet</b> to confirm the delivery at the end.</span></li>
        </ul>
        <GameButton ref="okRef" block @click="emit('close')">Got it — let's go</GameButton>
      </HoloPanel>
    </div>
  </Transition>
</template>

<style scoped lang="scss">
.sheet {
  position: absolute;
  inset: 0;
  z-index: 25;
  display: flex;
  align-items: flex-end;
  padding: var(--space-md);
  padding-bottom: max(var(--space-md), env(safe-area-inset-bottom));
  background: rgba(2, 10, 28, 0.66);

  &-card.holo-panel {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    width: 100%;
    padding: var(--space-lg) var(--space-md) var(--space-md);
  }

  &-title {
    font-size: 22px;
    font-weight: 900;
  }

  &-list {
    display: grid;
    gap: var(--space-sm);
    font-size: 14px;
    color: var(--color-text-300);

    li {
      display: flex;
      gap: var(--space-sm);
    }

    b {
      color: var(--color-text-100);
    }
  }
}

.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 0.25s ease;

  .sheet-card {
    transition: transform 0.35s var(--ease-out-back);
  }
}

.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;

  .sheet-card {
    transform: translateY(40px);
  }
}
</style>
