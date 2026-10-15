<script setup lang="ts">
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref, watch, type Component } from "vue";
import HomeScreen from "./screens/HomeScreen.vue";
import OrdersScreen from "./screens/OrdersScreen.vue";
import OrderScreen from "./screens/OrderScreen.vue";
import CongratsPopup from "./components/CongratsPopup.vue";
import Snackbar from "./components/Snackbar.vue";
import StatusBanners from "./components/StatusBanners.vue";
import SosSheet from "./components/SosSheet.vue";
import { connectClaims, useGame, type ScreenName } from "./store/game";
import { sounds } from "./composables/useSound";

const { state } = useGame();

const SCREENS: Record<ScreenName, Component> = {
  home: HomeScreen,
  orders: OrdersScreen,
  order: OrderScreen,
};

const activeScreen = computed(() => SCREENS[state.screen]);
// Same screen for a different order still counts as a new screen.
const screenKey = computed(() => `${state.screen}:${state.orderId ?? ""}`);

watch(screenKey, () => sounds.whoosh());

// The organiser page lives at <game URL>#organiser. Loaded only when opened.
const OrganiserScreen = defineAsyncComponent(() => import("./screens/OrganiserScreen.vue"));
const isOrganiserPage = ref(location.hash === "#organiser");
const syncRoute = () => (isOrganiserPage.value = location.hash === "#organiser");
window.addEventListener("hashchange", syncRoute);
onBeforeUnmount(() => window.removeEventListener("hashchange", syncRoute));

// Start listening for which orders are taken straight away, so the list is
// up to date by the time the player gets there.
onMounted(() => {
  if (!isOrganiserPage.value) void connectClaims();
});
watch(isOrganiserPage, (organiserPage) => {
  if (!organiserPage) void connectClaims();
});

// Fixed positions so the particles don't jump around on re-render.
const PARTICLES = Array.from({ length: 14 }, (_, index) => ({
  left: `${(index * 37) % 100}%`,
  delay: `${(index * 0.73) % 6}s`,
  duration: `${6 + ((index * 1.3) % 5)}s`,
  size: `${2 + (index % 3)}px`,
}));
</script>

<template>
  <OrganiserScreen v-if="isOrganiserPage" />
  <div v-else class="app">
    <div id="phone" class="app-phone">
      <div class="app-world" aria-hidden="true">
        <div class="app-floor"></div>
        <span
          v-for="(particle, index) in PARTICLES"
          :key="index"
          class="app-particle"
          :style="{
            left: particle.left,
            width: particle.size,
            height: particle.size,
            animationDelay: particle.delay,
            animationDuration: particle.duration,
          }"
        ></span>
      </div>

      <Transition :name="`screen-${state.direction}`">
        <div :key="screenKey" class="app-screen">
          <component :is="activeScreen" />
        </div>
      </Transition>

      <!-- Lives at phone level so it covers the frame, not the whole browser window. -->
      <CongratsPopup />
      <Snackbar />
      <SosSheet />
      <StatusBanners />
    </div>
  </div>
</template>

<style scoped lang="scss">
.app {
  min-height: 100vh; // fallback: iOS < 15.4 has no dvh
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(circle at 50% 20%, rgba(52, 191, 255, 0.16), transparent 55%),
    radial-gradient(circle at 80% 90%, rgba(255, 176, 32, 0.08), transparent 45%),
    var(--color-bg-900);

  // On phones the app is the whole screen.
  &-phone {
    position: relative;
    width: 100%;
    height: 100vh; // fallback: iOS < 15.4 has no dvh
    height: 100dvh;
    overflow: hidden;
    background: linear-gradient(180deg, var(--color-bg-800) 0%, var(--color-bg-700) 100%);
  }

  // On larger screens it sits in a phone-shaped frame.
  @media (min-width: 560px) {
    padding: 24px;

    &-phone {
      width: 400px;
      height: min(860px, calc(100vh - 48px));
      height: min(860px, calc(100dvh - 48px));
      border-radius: 44px;
      border: 1px solid rgba(129, 216, 255, 0.35);
      box-shadow:
        0 0 0 10px #050d1f,
        0 0 0 11px rgba(129, 216, 255, 0.25),
        0 40px 90px rgba(0, 0, 0, 0.6),
        0 0 80px rgba(52, 191, 255, 0.18);
    }
  }

  &-world {
    position: absolute;
    inset: 0;
    pointer-events: none;
    overflow: hidden;
  }

  // Hologram floor scrolling towards the viewer.
  &-floor {
    position: absolute;
    left: -60%;
    right: -60%;
    bottom: -8%;
    height: 55%;
    background-image:
      linear-gradient(rgba(52, 191, 255, 0.28) 1px, transparent 1px),
      linear-gradient(90deg, rgba(52, 191, 255, 0.28) 1px, transparent 1px);
    background-size: 44px 44px;
    transform: perspective(380px) rotateX(62deg);
    transform-origin: 50% 100%;
    mask-image: linear-gradient(to top, #000 10%, transparent 85%);
    animation: app-floor 3.5s linear infinite;
  }

  &-particle {
    position: absolute;
    bottom: -10px;
    border-radius: 50%;
    background: var(--color-cyan-300);
    box-shadow: 0 0 8px var(--color-cyan-400);
    opacity: 0;
    animation: app-rise linear infinite;
  }

  &-screen {
    position: absolute;
    inset: 0;
    z-index: 1;
    // Set explicitly: in testing the inherited colour came through as black here.
    color: var(--color-text-100);
    overflow-y: auto;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }
  }
}

@keyframes app-floor {
  to {
    background-position: 0 44px;
  }
}

@keyframes app-rise {
  0% {
    transform: translateY(0) scale(1);
    opacity: 0;
  }
  15% {
    opacity: 0.8;
  }
  100% {
    transform: translateY(-110vh) scale(0.4);
    opacity: 0;
  }
}

// Screen transitions — the new screen slides in from the direction of travel.
.screen-forward-enter-active,
.screen-forward-leave-active,
.screen-back-enter-active,
.screen-back-leave-active {
  transition:
    transform 0.42s var(--ease-smooth),
    opacity 0.32s ease;
}

.screen-forward-enter-from {
  transform: translateX(40%);
  opacity: 0;
}

.screen-forward-leave-to {
  transform: translateX(-25%) scale(0.96);
  opacity: 0;
}

.screen-back-enter-from {
  transform: translateX(-40%);
  opacity: 0;
}

.screen-back-leave-to {
  transform: translateX(25%) scale(0.96);
  opacity: 0;
}
</style>
