<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import gsap from "gsap";
import AppHeader from "../components/AppHeader.vue";
import PosterScene from "../components/PosterScene.vue";
import BouncyTitle from "../components/BouncyTitle.vue";
import LogoStrip from "../components/LogoStrip.vue";
import ChibiCrowd from "../components/ChibiCrowd.vue";
import NotificationToast from "../components/NotificationToast.vue";
import GameButton from "../components/GameButton.vue";
import { GAME, ORDERS, formatVnd } from "../config/game";
import { useGame } from "../store/game";
import { sounds } from "../composables/useSound";
import { prefersReducedMotion } from "../composables/useReducedMotion";

// The home screen follows the client's poster theme (hand-drawn, crayon
// colours); the in-game "shipper app" screens keep the hologram look.
//
// Flow: type your name → START → the notification drops in → tap → order list.

const { state, availableOrders, deliveredOrders, myOrder, earnings, go, start, openOrder, canReset, resetRound } =
  useGame();

const nameInput = ref(state.playerName);
const canStart = computed(() => nameInput.value.trim().length > 0);

const handleStart = () => {
  if (!canStart.value) return;
  start(nameInput.value);
};

const allDelivered = computed(() => deliveredOrders.value.length === ORDERS.length);

const bannerRef = ref<HTMLElement | null>(null);
const subtitleRef = ref<HTMLElement | null>(null);
const frameRef = ref<HTMLElement | null>(null);

onMounted(() => {
  if (prefersReducedMotion()) return;
  gsap
    .timeline({ delay: 0.6 })
    .fromTo(bannerRef.value, { scaleX: 0, rotate: -4 }, { scaleX: 1, rotate: -2, duration: 0.55, ease: "back.out(1.6)" })
    .fromTo(subtitleRef.value, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.4 }, "-=0.15")
    .fromTo(frameRef.value, { autoAlpha: 0, y: 30, rotate: 2 }, { autoAlpha: 1, y: 0, rotate: 0, duration: 0.6, ease: "back.out(1.5)" }, "-=0.2");
});

const openMyOrder = () => {
  if (!myOrder.value) return;
  sounds.tap();
  openOrder(myOrder.value.id);
};
</script>

<template>
  <div class="home">
    <PosterScene />
    <ChibiCrowd />

    <div class="home-layer">
      <AppHeader tone="paper" :earnings="earnings" />

      <!-- Drops in as soon as START is pressed. -->
      <div class="home-toast">
        <NotificationToast
          v-if="state.started && !myOrder && !allDelivered"
          :app-name="GAME.appName"
          :title="availableOrders.length > 0 ? `${availableOrders.length} orders need handling` : 'All orders are taken'"
          :message="availableOrders.length > 0 ? 'Tap to see the order list' : 'Tap to see who took them'"
          :badge="availableOrders.length"
          :delay="0.15"
          @open="go('orders')"
        />
      </div>

      <main class="home-hero">
        <LogoStrip class="home-logos" />
        <BouncyTitle :text="GAME.title" />

        <div ref="bannerRef" class="home-banner">
          <svg class="home-banner-brush" viewBox="0 0 320 64" preserveAspectRatio="none" aria-hidden="true">
            <path
              d="M6 20c40-10 90-14 150-12s110 2 158 6c4 0 6 6 2 8-6 2-4 6 1 8 4 2 2 7-3 8-50 8-108 12-160 12S48 46 10 44c-5 0-7-6-2-8 5-2 4-6-1-8-4-2-5-7-1-8Z"
            />
          </svg>
          <p class="home-banner-text">{{ GAME.banner }}</p>
        </div>

        <p ref="subtitleRef" class="home-subtitle">
          <span class="home-subtitle-rays" aria-hidden="true"></span>
          {{ GAME.subtitle }}
          <span class="home-subtitle-rays home-subtitle-rays-right" aria-hidden="true"></span>
        </p>

        <!-- Hand-drawn frame, like the poster's photo frame — the game happens in here. -->
        <section ref="frameRef" class="home-frame">
          <form v-if="!state.started" class="home-start-form" @submit.prevent="handleStart">
            <svg class="home-scooter" viewBox="0 0 120 70" aria-hidden="true">
              <path d="M30 18h22v18H30Z" class="home-scooter-box" />
              <path d="M18 46h56l12-22h12" class="home-scooter-body" />
              <path d="M58 46c0-8 6-12 14-12" class="home-scooter-body" />
              <circle cx="26" cy="52" r="10" class="home-scooter-wheel" />
              <circle cx="90" cy="52" r="10" class="home-scooter-wheel" />
              <path d="M2 30h12M6 38h10M0 46h10" class="home-scooter-speed" />
            </svg>
            <label class="home-name">
              <span class="home-name-label">What's your name, shipper?</span>
              <input
                v-model="nameInput"
                class="home-name-input"
                type="text"
                maxlength="24"
                placeholder="Your name"
                autocomplete="given-name"
                enterkeyhint="go"
                required
              />
            </label>
            <GameButton variant="crayon" class="home-start" type="submit" :disabled="!canStart">START</GameButton>
          </form>

          <template v-else-if="allDelivered">
            <p class="home-finished-title">All delivered! 🎉</p>
            <p class="home-frame-hint">The whole team has delivered every order.</p>
            <GameButton v-if="canReset" variant="crayon" block @click="resetRound">Play again</GameButton>
          </template>

          <template v-else>
            <p class="home-greeting">Hi, {{ state.playerName }}! 👋</p>
            <template v-if="myOrder">
              <p class="home-frame-hint">You're delivering Order {{ myOrder.number }}.</p>
              <GameButton variant="crayon" block @click="openMyOrder">Open my order</GameButton>
            </template>
            <p v-else class="home-frame-hint home-frame-hint-strong">↑ Tap the notification above</p>
          </template>

          <dl v-if="state.started" class="home-stats">
            <div>
              <dt>Available</dt>
              <dd>{{ availableOrders.length }}</dd>
            </div>
            <div>
              <dt>Delivered</dt>
              <dd>{{ deliveredOrders.length }}/{{ ORDERS.length }}</dd>
            </div>
            <div>
              <dt>Earnings</dt>
              <dd>{{ formatVnd(earnings) }}</dd>
            </div>
          </dl>
        </section>

        <button v-if="canReset && state.started && deliveredOrders.length > 0" type="button" class="home-reset" @click="resetRound">
          Start over
        </button>
      </main>
    </div>
  </div>
</template>

<style scoped lang="scss">
.home {
  position: relative;
  min-height: 100%;
  color: var(--color-poster-ink);

  &-layer {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    min-height: 100%;
    // Leave room for the harbour scene at the bottom of the poster.
    padding-bottom: 170px;
  }

  // Overlays the top of the poster like a real push notification, instead of
  // reserving empty space for it.
  &-toast {
    position: absolute;
    top: max(var(--space-sm), env(safe-area-inset-top));
    left: var(--space-md);
    right: var(--space-md);
    z-index: 10;
  }

  &-logos {
    margin-bottom: var(--space-sm);
  }

  &-hero {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-sm);
    padding: 0 var(--space-md);
    text-align: center;
  }

  // Brush-stroke banner under the title.
  &-banner {
    position: relative;
    display: grid;
    place-items: center;
    width: min(100%, 300px);
    height: 58px;
    margin-top: 4px;
    transform: rotate(-2deg);
    transform-origin: left center;

    &-brush {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;

      path {
        fill: var(--color-poster-blue);
        filter: drop-shadow(2px 3px 0 var(--color-poster-ink));
      }
    }

    &-text {
      position: relative;
      font-family: var(--font-hand);
      font-weight: 700;
      font-size: 22px;
      color: var(--color-poster-yellow);
      text-shadow: 2px 2px 0 var(--color-poster-ink);
    }
  }

  // Yellow handwritten line with little sun-ray dashes, like the poster's date.
  &-subtitle {
    display: flex;
    align-items: center;
    gap: 8px;
    max-width: 330px;
    font-family: var(--font-hand);
    font-weight: 700;
    font-size: 15px;
    color: #e58a00;
    text-shadow: 1px 1px 0 #fff;

    &-rays {
      flex-shrink: 0;
      width: 16px;
      height: 14px;
      background:
        linear-gradient(-25deg, transparent 45%, var(--color-poster-yellow) 45% 60%, transparent 60%) top / 100% 50% no-repeat,
        linear-gradient(25deg, transparent 45%, var(--color-poster-yellow) 45% 60%, transparent 60%) bottom / 100% 50% no-repeat;

      &-right {
        transform: scaleX(-1);
      }
    }
  }

  // Hand-drawn frame: wonky border radius is the classic "sketched box" trick.
  &-frame {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-sm);
    width: 100%;
    margin-top: var(--space-sm);
    padding: var(--space-lg) var(--space-md) var(--space-md);
    border: 3px solid var(--color-poster-blue);
    border-radius: 255px 18px 225px 18px / 18px 225px 18px 255px;
    background: rgba(255, 255, 255, 0.78);
    box-shadow:
      0 0 0 6px rgba(255, 255, 255, 0.55),
      4px 6px 0 rgba(42, 85, 201, 0.35);

    &-hint {
      font-family: var(--font-hand);
      font-weight: 600;
      font-size: 14px;
      color: #4a5a8a;

      &-strong {
        font-weight: 700;
        font-size: 15px;
        color: var(--color-poster-blue);
      }
    }
  }

  &-scooter {
    width: 120px;
    animation: home-scooter 0.5s ease-in-out infinite alternate;

    &-box {
      fill: var(--color-poster-yellow);
      stroke: var(--color-poster-ink);
      stroke-width: 3;
      stroke-linejoin: round;
    }

    &-body {
      fill: none;
      stroke: var(--color-poster-red);
      stroke-width: 5;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    &-wheel {
      fill: #fff;
      stroke: var(--color-poster-ink);
      stroke-width: 4;
    }

    &-speed {
      stroke: var(--color-poster-blue-light);
      stroke-width: 3;
      stroke-linecap: round;
      animation: home-speed 0.4s linear infinite;
    }
  }

  // Doubled class so these win over GameButton's own sizing.
  &-start.game-button {
    min-width: 210px;
    min-height: 62px;
    font-size: 28px;
    letter-spacing: 0.16em;
    animation: home-wiggle 2.4s ease-in-out infinite;
  }

  &-start-form {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-sm);
    width: 100%;
  }

  &-name {
    display: flex;
    flex-direction: column;
    gap: 6px;
    width: 100%;
    max-width: 280px;

    &-label {
      font-family: var(--font-hand);
      font-weight: 700;
      font-size: 15px;
      color: var(--color-poster-blue);
    }

    // Hand-drawn input: wonky radius, ink outline, offset shadow.
    &-input {
      width: 100%;
      min-height: 48px;
      padding: 10px 14px;
      border: 2.5px solid var(--color-poster-ink);
      border-radius: 14px 18px 12px 20px / 18px 12px 20px 14px;
      background: #fff;
      box-shadow: 3px 4px 0 rgba(31, 42, 110, 0.35);
      color: var(--color-poster-ink);
      // 16px+ stops iOS Safari zooming in when the field is focused.
      font-family: var(--font-poster);
      font-weight: 800;
      font-size: 20px;
      text-align: center;

      &::placeholder {
        color: rgba(31, 42, 110, 0.35);
      }

      &:focus {
        outline: none;
        border-color: var(--color-poster-red);
        box-shadow: 3px 4px 0 var(--color-poster-red);
      }
    }
  }

  &-greeting {
    font-family: var(--font-poster);
    font-weight: 800;
    font-size: 24px;
    color: var(--color-poster-red);
  }

  &-finished-title {
    font-family: var(--font-poster);
    font-weight: 800;
    font-size: 26px;
    color: var(--color-poster-red);
  }

  &-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-xs);
    width: 100%;
    margin: var(--space-xs) 0 0;
    padding-top: var(--space-sm);
    border-top: 2px dashed rgba(42, 85, 201, 0.35);

    dt {
      font-family: var(--font-hand);
      font-size: 12px;
      font-weight: 600;
      color: #4a5a8a;
    }

    dd {
      margin: 2px 0 0;
      font-family: var(--font-poster);
      font-weight: 800;
      font-size: 19px;
      color: var(--color-poster-blue);
    }
  }

  &-reset {
    border: none;
    background: none;
    font-family: var(--font-hand);
    font-size: 13px;
    color: #4a5a8a;
    text-decoration: underline;
    cursor: pointer;
  }
}

@keyframes home-scooter {
  to {
    transform: translateY(-3px) rotate(-1.5deg);
  }
}

@keyframes home-speed {
  from {
    transform: translateX(4px);
    opacity: 1;
  }
  to {
    transform: translateX(-6px);
    opacity: 0.2;
  }
}

// START tilts side to side every few seconds to invite a tap.
@keyframes home-wiggle {
  0%,
  60%,
  100% {
    rotate: 0deg;
  }
  70% {
    rotate: -4deg;
  }
  80% {
    rotate: 4deg;
  }
  90% {
    rotate: -2deg;
  }
}
</style>
