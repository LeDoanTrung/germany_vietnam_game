<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useId, watch } from "vue";
import gsap from "gsap";
import type { Order } from "../config/game";
import { prefersReducedMotion } from "../composables/useReducedMotion";

const props = defineProps<{
  order: Order;
  /**
   * waiting    — shipper parked at the start, waiting to accept
   * delivering — riding from start to end, on a loop
   * done       — parked at the end
   */
  mode: "waiting" | "delivering" | "done";
}>();

// Two maps can exist at once mid-transition, so SVG ids must be unique.
const uid = useId();
const gridId = `route-grid-${uid}`;

const START = { x: 46, y: 162 };
const END = { x: 294, y: 54 };
const ROUTE = `M ${START.x} ${START.y} C 104 162 92 78 162 88 S 236 158 ${END.x} ${END.y}`;

const routeRef = ref<SVGPathElement | null>(null);
const travelledRef = ref<SVGPathElement | null>(null);
const riderRef = ref<SVGGElement | null>(null);

let timeline: gsap.core.Timeline | null = null;

// Place the rider at `t` (0–1) along the route, tilted to follow the curve and
// flipped when the road heads left.
const placeRider = (t: number) => {
  const path = routeRef.value;
  const rider = riderRef.value;
  if (!path || !rider) return;
  const length = path.getTotalLength();
  const point = path.getPointAtLength(length * t);
  const ahead = path.getPointAtLength(Math.min(length, length * t + 2));
  const behind = path.getPointAtLength(Math.max(0, length * t - 2));
  const dx = ahead.x - behind.x;
  const dy = ahead.y - behind.y;
  const flip = dx < 0 ? -1 : 1;
  const angle = Math.max(-28, Math.min(28, (Math.atan2(dy, Math.abs(dx)) * 180) / Math.PI));
  rider.setAttribute("transform", `translate(${point.x} ${point.y}) scale(${flip} 1) rotate(${angle})`);
};

const setTravelled = (t: number) => {
  const path = travelledRef.value;
  if (!path) return;
  const length = path.getTotalLength();
  path.style.strokeDasharray = `${length}`;
  path.style.strokeDashoffset = `${length * (1 - t)}`;
};

const play = () => {
  timeline?.kill();

  if (props.mode === "waiting") {
    setTravelled(0);
    placeRider(0);
    return;
  }

  if (props.mode === "done") {
    setTravelled(1);
    placeRider(1);
    return;
  }

  if (prefersReducedMotion()) {
    setTravelled(0.5);
    placeRider(0.5);
    return;
  }

  // Ride the whole route, pause at the end, and go again.
  const progress = { t: 0 };
  timeline = gsap.timeline({ repeat: -1, repeatDelay: 0.7 }).fromTo(
    progress,
    { t: 0 },
    {
      t: 1,
      duration: 4,
      ease: "power1.inOut",
      onUpdate: () => {
        placeRider(progress.t);
        setTravelled(progress.t);
      },
    },
  );
};

onMounted(play);
watch(() => props.mode, play);
onBeforeUnmount(() => timeline?.kill());
</script>

<template>
  <figure :class="['route', `route-${props.mode}`]">
    <svg
      viewBox="0 0 340 210"
      role="img"
      :aria-label="`Bản đồ: từ ${props.order.from.name} đến ${props.order.to.name}`"
    >
      <defs>
        <pattern :id="gridId" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(129,216,255,0.07)" stroke-width="1" />
        </pattern>
      </defs>
      <rect width="340" height="210" :fill="`url(#${gridId})`" />

      <!-- Scenery -->
      <path d="M -10 196 C 60 180 120 206 190 186 S 300 170 350 186" class="route-river" />
      <g class="route-blocks">
        <rect x="18" y="22" width="34" height="26" rx="4" />
        <rect x="58" y="30" width="22" height="18" rx="3" />
        <rect x="214" y="104" width="30" height="22" rx="4" />
        <rect x="250" y="112" width="40" height="28" rx="4" />
        <rect x="112" y="128" width="26" height="20" rx="3" />
        <rect x="300" y="146" width="28" height="22" rx="3" />
      </g>
      <g class="route-trees">
        <circle cx="98" cy="44" r="7" />
        <circle cx="110" cy="52" r="5" />
        <circle cx="196" cy="40" r="6" />
        <circle cx="146" cy="160" r="6" />
        <circle cx="30" cy="110" r="6" />
        <circle cx="314" cy="102" r="5" />
      </g>
      <g class="route-clouds">
        <ellipse class="route-cloud" cx="120" cy="20" rx="20" ry="7" />
        <ellipse class="route-cloud route-cloud-slow" cx="250" cy="28" rx="26" ry="8" />
      </g>

      <!-- Road and the part already ridden -->
      <path :d="ROUTE" class="route-road" />
      <path ref="routeRef" :d="ROUTE" class="route-line" />
      <path ref="travelledRef" :d="ROUTE" class="route-travelled" />

      <!-- Start and end pins -->
      <g class="route-pin route-pin-start" :transform="`translate(${START.x} ${START.y})`">
        <circle class="route-pin-ring" r="13" />
        <circle r="13" />
        <text dy="4.5">{{ props.order.from.label }}</text>
      </g>
      <g class="route-pin route-pin-end" :transform="`translate(${END.x} ${END.y})`">
        <circle class="route-pin-ring" r="13" />
        <circle r="13" />
        <text dy="4.5">{{ props.order.to.label }}</text>
      </g>

      <!-- Rider, drawn around its own origin -->
      <g ref="riderRef" class="route-rider" :transform="`translate(${START.x} ${START.y})`">
        <g class="route-rider-bob">
          <g class="route-rider-speed">
            <path d="M -26 -14 H -18" />
            <path d="M -30 -9 H -20" />
            <path d="M -25 -4 H -17" />
          </g>
          <rect x="-11" y="-22" width="13" height="10" rx="2" class="route-rider-box" />
          <path d="M -13 -6 H 6 L 11 -14 H 15" class="route-rider-body" />
          <circle cx="-9" cy="-3" r="4.2" class="route-rider-wheel" />
          <circle cx="11" cy="-3" r="4.2" class="route-rider-wheel" />
        </g>
      </g>
    </svg>

    <figcaption class="route-caption">
      <span class="route-caption-stop">
        <b>{{ props.order.from.label }}</b>
        <span>
          <small>Điểm đầu</small>
          {{ props.order.from.name }}
        </span>
      </span>
      <span class="route-caption-arrow" aria-hidden="true"></span>
      <span class="route-caption-stop route-caption-stop-end">
        <b>{{ props.order.to.label }}</b>
        <span>
          <small>Điểm cuối</small>
          {{ props.order.to.name }}
        </span>
      </span>
    </figcaption>
  </figure>
</template>

<style scoped lang="scss">
.route {
  margin: 0;
  border-radius: var(--radius-md);
  border: 1px solid rgba(52, 191, 255, 0.35);
  background:
    radial-gradient(circle at 50% 35%, rgba(52, 191, 255, 0.12), transparent 70%),
    rgba(2, 10, 28, 0.6);
  overflow: hidden;

  svg {
    display: block;
    width: 100%;
    height: auto;
  }

  &-river {
    fill: none;
    stroke: rgba(52, 191, 255, 0.16);
    stroke-width: 14;
    stroke-linecap: round;
  }

  &-blocks rect {
    fill: rgba(52, 191, 255, 0.07);
    stroke: rgba(129, 216, 255, 0.28);
    stroke-width: 1;
  }

  &-trees circle {
    fill: rgba(62, 224, 143, 0.22);
    stroke: rgba(62, 224, 143, 0.5);
    stroke-width: 1;
  }

  &-cloud {
    fill: rgba(225, 245, 255, 0.08);
    animation: route-drift 14s ease-in-out infinite alternate;

    &-slow {
      animation-duration: 20s;
      animation-direction: alternate-reverse;
    }
  }

  &-road {
    fill: none;
    stroke: rgba(4, 18, 46, 0.9);
    stroke-width: 14;
    stroke-linecap: round;
  }

  &-line {
    fill: none;
    stroke: rgba(129, 216, 255, 0.4);
    stroke-width: 2.5;
    stroke-dasharray: 3 7;
    stroke-linecap: round;
  }

  &-travelled {
    fill: none;
    stroke: var(--color-amber-400);
    stroke-width: 3.5;
    stroke-linecap: round;
    filter: drop-shadow(0 0 4px rgba(255, 176, 32, 0.9));
  }

  &-pin {
    circle {
      fill: var(--color-bg-800);
      stroke: var(--color-cyan-400);
      stroke-width: 2.2;
    }

    text {
      fill: var(--color-cyan-100);
      font: 700 13px var(--font-mono);
      text-anchor: middle;
    }

    &-ring {
      fill: none !important;
      opacity: 0;
    }

    &-end circle {
      stroke: var(--color-amber-400);
    }
  }

  // The pin the shipper is heading for pulses.
  &-waiting &-pin-start &-pin-ring,
  &-delivering &-pin-end &-pin-ring {
    opacity: 1;
    stroke: var(--color-amber-400);
    transform-box: fill-box;
    transform-origin: center;
    animation: route-ping 1.4s ease-out infinite;
  }

  &-done &-pin-end circle {
    fill: var(--color-green-400);
    stroke: var(--color-green-400);
  }

  &-done &-pin-end text {
    fill: #002614;
  }

  &-rider {
    &-bob {
      animation: route-bob 0.4s ease-in-out infinite alternate;
    }

    &-box {
      fill: var(--color-amber-400);
      stroke: #1d1200;
      stroke-width: 1.2;
    }

    &-body {
      fill: none;
      stroke: var(--color-cyan-100);
      stroke-width: 3;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    &-wheel {
      fill: var(--color-bg-900);
      stroke: var(--color-cyan-100);
      stroke-width: 2;
    }

    &-speed {
      opacity: 0;

      path {
        stroke: var(--color-cyan-300);
        stroke-width: 1.6;
        stroke-linecap: round;
      }
    }
  }

  &-delivering &-rider-speed {
    opacity: 1;
    animation: route-speed 0.35s linear infinite;
  }

  &-waiting &-rider-bob,
  &-done &-rider-bob {
    animation-duration: 1.2s;
  }

  &-caption {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-sm) var(--space-md);
    border-top: 1px solid rgba(52, 191, 255, 0.2);
    font-size: 13px;
    font-weight: 700;

    &-stop {
      display: flex;
      align-items: center;
      gap: var(--space-xs);
      flex: 1;
      min-width: 0;

      b {
        display: grid;
        place-items: center;
        flex-shrink: 0;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 1.5px solid var(--color-cyan-400);
        font-family: var(--font-mono);
        font-size: 12px;
      }

      small {
        display: block;
        font-size: 11px;
        font-weight: 400;
        color: var(--color-text-300);
      }

      &-end {
        justify-content: flex-end;
        text-align: right;

        b {
          order: 1;
          border-color: var(--color-amber-400);
        }
      }
    }

    &-arrow {
      flex-shrink: 0;
      width: 22px;
      height: 2px;
      background: linear-gradient(90deg, var(--color-cyan-400), var(--color-amber-400));
      position: relative;

      &::after {
        content: "";
        position: absolute;
        right: -1px;
        top: -3px;
        width: 7px;
        height: 7px;
        border-top: 2px solid var(--color-amber-400);
        border-right: 2px solid var(--color-amber-400);
        transform: rotate(45deg);
      }
    }
  }
}

@keyframes route-ping {
  from {
    transform: scale(1);
    opacity: 0.9;
  }
  to {
    transform: scale(2.1);
    opacity: 0;
  }
}

@keyframes route-bob {
  to {
    transform: translateY(-1.6px);
  }
}

@keyframes route-speed {
  from {
    transform: translateX(3px);
  }
  to {
    transform: translateX(-3px);
  }
}

@keyframes route-drift {
  to {
    transform: translateX(28px);
  }
}
</style>
