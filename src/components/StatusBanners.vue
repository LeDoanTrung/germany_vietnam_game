<script setup lang="ts">
import { ref } from "vue";
import { useGame } from "../store/game";
import { isInAppBrowser, isIOS } from "../utils/device";

// Banners pinned to the top of the phone frame:
//   - opened inside Messenger/Zalo/etc. → ask to open in Safari/Chrome
//   - no network → explain what still works

const { state, showNotice } = useGame();

const DISMISS_KEY = "shipper-game:in-app-dismissed";
const readDismissed = () => {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
};
const inAppVisible = ref(isInAppBrowser && !readDismissed());

const dismissInApp = () => {
  inAppVisible.value = false;
  try {
    sessionStorage.setItem(DISMISS_KEY, "1");
  } catch {
    // Shows again next time; harmless.
  }
};

const copyLink = async () => {
  try {
    await navigator.clipboard.writeText(location.href);
    showNotice(`Link copied — paste it into ${isIOS ? "Safari" : "Chrome"}.`);
  } catch {
    showNotice("Couldn't copy — use the ⋯ menu and choose “Open in browser”.");
  }
};
</script>

<template>
  <div class="banners">
    <div v-if="inAppVisible" class="banner banner-warn" role="alert">
      <p class="banner-text">
        <b>Open this game in {{ isIOS ? "Safari" : "Chrome" }}.</b>
        Chat apps often block location and can lose your order. Tap <b>⋯</b> (top right) →
        <b>Open in {{ isIOS ? "Safari" : "browser" }}</b>.
      </p>
      <div class="banner-actions">
        <button type="button" class="banner-button" @click="copyLink">Copy link</button>
        <button type="button" class="banner-close" aria-label="Dismiss" @click="dismissInApp">✕</button>
      </div>
    </div>

    <div v-if="state.offline" class="banner banner-offline" role="status">
      <p class="banner-text">
        <b>You're offline.</b> GPS still works, but taking or confirming an order needs internet.
      </p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.banners {
  position: absolute;
  top: max(6px, env(safe-area-inset-top));
  left: var(--space-sm);
  right: var(--space-sm);
  z-index: 40;
  display: flex;
  flex-direction: column;
  gap: 6px;
  pointer-events: none;
}

.banner {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: 10px 12px;
  border-radius: var(--radius-md);
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.4);
  font-family: var(--font-display);
  font-size: 13px;
  line-height: 1.35;
  pointer-events: auto;

  &-warn {
    background: #fff4d6;
    border: 2px solid var(--color-amber-400);
    color: #3b2a00;
  }

  &-offline {
    background: rgba(10, 30, 66, 0.96);
    border: 1px solid var(--color-red-400);
    color: var(--color-text-100);
  }

  &-text {
    flex: 1;
  }

  &-actions {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  &-button {
    min-height: 36px;
    padding: 6px 12px;
    border: none;
    border-radius: var(--radius-pill);
    background: var(--color-amber-400);
    color: #1d1200;
    font-weight: 900;
    white-space: nowrap;
    cursor: pointer;
  }

  &-close {
    width: 36px;
    height: 36px;
    border: none;
    background: none;
    color: inherit;
    font-size: 16px;
    cursor: pointer;
  }
}
</style>
