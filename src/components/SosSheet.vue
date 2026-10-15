<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import HoloPanel from "./HoloPanel.vue";
import { SOS } from "../config/game";
import { sosOpen } from "../composables/useSos";
import { sounds } from "../composables/useSound";
import { useGame } from "../store/game";

// Lost or in trouble: open the group's WhatsApp chat. Players can also copy
// their location as a Google Maps link to paste into the chat, so the
// organiser can see where they are.

const { state, myOrder, showNotice } = useGame();

const groupLinkRef = ref<HTMLAnchorElement | null>(null);
const locating = ref(false);

const close = () => {
  sosOpen.value = false;
};

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === "Escape") close();
};

watch(sosOpen, async (open) => {
  if (open) {
    window.addEventListener("keydown", handleKeydown);
    await nextTick();
    groupLinkRef.value?.focus();
  } else {
    window.removeEventListener("keydown", handleKeydown);
  }
});

const handleOpenGroup = () => {
  sounds.tap();
  // The link itself opens WhatsApp; close the sheet so the game is tidy on return.
  window.setTimeout(close, 300);
};

/** One fresh GPS fix, just for this message. */
const currentPosition = () =>
  new Promise<GeolocationPosition>((resolve, reject) => {
    if (!("geolocation" in navigator)) return reject(new Error("unsupported"));
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      maximumAge: 30000,
      timeout: 15000,
    });
  });

const copyLocation = async () => {
  sounds.tap();
  locating.value = true;
  try {
    const { coords } = await currentPosition();
    const who = state.playerName || "A player";
    const order = myOrder.value ? ` (Order ${myOrder.value.number})` : "";
    const message = `🆘 ${who}${order} needs help. I'm here: https://maps.google.com/?q=${coords.latitude.toFixed(6)},${coords.longitude.toFixed(6)}`;
    await navigator.clipboard.writeText(message);
    showNotice("Location copied — paste it into the WhatsApp group.", 5000);
  } catch (error) {
    const denied = (error as GeolocationPositionError).code === 1;
    showNotice(
      denied
        ? "Location is off — describe where you are in the group instead."
        : "Couldn't get your location — describe where you are in the group instead.",
      5000,
    );
  } finally {
    locating.value = false;
  }
};
</script>

<template>
  <Transition name="sos">
    <div v-if="sosOpen" class="sos" role="dialog" aria-modal="true" aria-labelledby="sos-title" @click.self="close">
      <HoloPanel tone="amber" class="sos-card">
        <div class="sos-head">
          <h2 id="sos-title" class="sos-title">🆘 Need help?</h2>
          <button type="button" class="sos-close" aria-label="Close" @click="close">✕</button>
        </div>
        <p class="sos-copy">Lost, a problem with the bike, or anything else — message the group and the organisers will help.</p>

        <ol class="sos-steps">
          <li>
            <button type="button" class="sos-action sos-action-secondary" :disabled="locating" @click="copyLocation">
              📍 {{ locating ? "Getting your location…" : "Copy my location" }}
            </button>
          </li>
          <li>
            <a
              ref="groupLinkRef"
              class="sos-action sos-action-primary"
              :href="SOS.whatsappGroupUrl"
              target="_blank"
              rel="noopener noreferrer"
              @click="handleOpenGroup"
            >
              💬 Open the WhatsApp group
            </a>
          </li>
        </ol>
        <p class="sos-note">Then paste your location into the chat. In an emergency, call <b>115</b> (ambulance) or <b>113</b> (police).</p>
      </HoloPanel>
    </div>
  </Transition>
</template>

<style scoped lang="scss">
.sos {
  position: absolute;
  inset: 0;
  z-index: 35;
  display: flex;
  align-items: flex-end;
  padding: var(--space-md);
  padding-bottom: max(var(--space-md), env(safe-area-inset-bottom));
  background: rgba(2, 10, 28, 0.7);

  &-card.holo-panel {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    width: 100%;
    padding: var(--space-md);
  }

  &-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &-title {
    font-size: 22px;
    font-weight: 900;
  }

  &-close {
    width: 40px;
    height: 40px;
    border: 1px solid rgba(52, 191, 255, 0.4);
    border-radius: 50%;
    background: rgba(52, 191, 255, 0.1);
    color: var(--color-text-100);
    cursor: pointer;
  }

  &-copy,
  &-note {
    font-size: 14px;
    color: var(--color-text-300);

    b {
      color: var(--color-text-100);
    }
  }

  &-steps {
    display: grid;
    gap: var(--space-xs);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &-action {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: 52px;
    padding: 12px 18px;
    border-radius: var(--radius-pill);
    font-weight: 900;
    font-size: 16px;
    text-decoration: none;
    cursor: pointer;

    &-primary {
      border: none;
      background: #25d366;
      color: #002814;
      box-shadow: 0 0 22px rgba(37, 211, 102, 0.45);
    }

    &-secondary {
      border: 1px solid rgba(52, 191, 255, 0.55);
      background: rgba(52, 191, 255, 0.12);
      color: var(--color-cyan-100);
    }

    &:disabled {
      opacity: 0.6;
    }
  }
}

.sos-enter-active,
.sos-leave-active {
  transition: opacity 0.2s ease;

  .sos-card {
    transition: transform 0.3s var(--ease-out-back);
  }
}

.sos-enter-from,
.sos-leave-to {
  opacity: 0;

  .sos-card {
    transform: translateY(40px);
  }
}
</style>
