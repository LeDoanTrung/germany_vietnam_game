<script setup lang="ts">
import { useId } from "vue";

// Half-body chibi characters waving at the bottom of the home poster: the
// group is from Africa, Europe and Vietnam (client request). Drawn in SVG in
// the poster's crayon style rather than as images, so they stay sharp, light
// and can move. Characters differ by skin tone and hair only — no caricature.

type Hair = "afro" | "blonde" | "bob";

type Chibi = {
  x: number;
  skin: string;
  hair: Hair;
  hairColor: string;
  shirt: string;
  /** Wave with the left hand instead of the right. */
  flip?: boolean;
  /** Offsets the wave and blink so they don't move in lockstep. */
  delay: number;
};

const CHIBIS: Chibi[] = [
  { x: 82, skin: "#8a5534", hair: "afro", hairColor: "#2b1a12", shirt: "#ffd23f", flip: true, delay: 0 },
  { x: 200, skin: "#f1c7a3", hair: "bob", hairColor: "#1d1714", shirt: "#ef4a24", delay: 0.35 },
  { x: 318, skin: "#f7d9c4", hair: "blonde", hairColor: "#f0c04a", shirt: "#2a55c9", delay: 0.7 },
];

const crayonId = `chibi-crayon-${useId()}`;
</script>

<template>
  <svg class="chibi" viewBox="0 0 400 170" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
    <defs>
      <!-- Crayon grain on clothes and hair; faces stay clean. -->
      <filter :id="crayonId" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="11" result="noise" />
        <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.6 1.75" result="grain" />
        <feComposite in="SourceGraphic" in2="grain" operator="in" result="grainy" />
        <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="2" result="warp" />
        <feDisplacementMap in="grainy" in2="warp" scale="2" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </defs>

    <g v-for="(chibi, index) in CHIBIS" :key="index" :transform="`translate(${chibi.x} 80) scale(${chibi.flip ? -1 : 1} 1)`">
      <!-- Only the arm and eyes move: they carry no crayon filter, so the
           filtered clothes and hair are rendered once (keeps phones smooth). -->
      <g>
        <!-- Hair that sits behind the head -->
        <g :filter="`url(#${crayonId})`" :fill="chibi.hairColor" class="chibi-ink">
          <template v-if="chibi.hair === 'afro'">
            <circle cx="-22" cy="-16" r="16" />
            <circle cx="0" cy="-28" r="19" />
            <circle cx="22" cy="-16" r="16" />
            <circle cx="-27" cy="4" r="12" />
            <circle cx="27" cy="4" r="12" />
          </template>
          <path v-else-if="chibi.hair === 'bob'" d="M-33 -4C-33 -40 33 -40 33 -4V20C33 24 26 26 22 22H-22C-26 26-33 24-33 20Z" />
        </g>

        <!-- Body: shirt cut off by the bottom edge (half body) -->
        <g :filter="`url(#${crayonId})`">
          <path d="M-38 92C-38 58-26 44 0 44S38 58 38 92V100H-38Z" :fill="chibi.shirt" class="chibi-ink" />
        </g>
        <path d="M-9 45L0 56 9 45" class="chibi-collar" />
        <!-- Lanyard and name badge: they're one team -->
        <path d="M-7 47L-2 70M7 47L2 70" class="chibi-lanyard" />
        <rect x="-8" y="68" width="16" height="12" rx="2" class="chibi-badge" />
        <rect x="-8" y="68" width="16" height="4" rx="1" class="chibi-badge-stripe" />

        <!-- Neck and head -->
        <rect x="-6" y="24" width="12" height="16" :fill="chibi.skin" class="chibi-ink" />
        <circle cx="0" cy="0" r="29" :fill="chibi.skin" class="chibi-ink" />

        <!-- Hair that sits on top of the head -->
        <g :filter="`url(#${crayonId})`" :fill="chibi.hairColor" class="chibi-ink">
          <path v-if="chibi.hair === 'bob'" d="M-27-8C-26-32 26-32 27-8L18-12 10-8 2-13-6-8-14-12-22-8Z" />
          <path v-else-if="chibi.hair === 'blonde'" d="M-30 2C-34-34 32-38 30-2 24-16 12-22 2-15-8-22-22-16-30 2Z" />
        </g>

        <!-- Face -->
        <g class="chibi-eyes" :style="{ animationDelay: `${1.5 + chibi.delay * 3}s` }">
          <ellipse cx="-10" cy="3" rx="3.6" ry="4.6" class="chibi-eye" />
          <ellipse cx="10" cy="3" rx="3.6" ry="4.6" class="chibi-eye" />
          <circle cx="-8.8" cy="1.4" r="1.3" class="chibi-shine" />
          <circle cx="11.2" cy="1.4" r="1.3" class="chibi-shine" />
        </g>
        <circle cx="-17" cy="11" r="4.5" class="chibi-blush" />
        <circle cx="17" cy="11" r="4.5" class="chibi-blush" />
        <path d="M-7 12Q0 21 7 12Z" class="chibi-mouth" />

        <!-- Waving arm: sleeve, arm, hand -->
        <g class="chibi-arm" :style="{ animationDelay: `${chibi.delay}s` }">
          <path d="M28 52L38 38" class="chibi-limb-ink" />
          <path d="M28 52L38 38" class="chibi-sleeve" :stroke="chibi.shirt" />
          <path d="M38 38L46 12 50-10" class="chibi-limb-ink" />
          <path d="M38 38L46 12 50-10" class="chibi-limb" :stroke="chibi.skin" />
          <circle cx="51" cy="-16" r="9" :fill="chibi.skin" class="chibi-ink" />
          <path d="M44-22L42-28M50-25V-31M56-22L59-27" class="chibi-fingers" />
        </g>
      </g>
    </g>
  </svg>
</template>

<style scoped lang="scss">
.chibi {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  height: 170px;
  pointer-events: none;

  &-ink {
    stroke: var(--color-poster-ink);
    stroke-width: 2.2;
    stroke-linejoin: round;
  }

  &-collar {
    fill: none;
    stroke: var(--color-poster-ink);
    stroke-width: 2;
    stroke-linejoin: round;
  }

  &-lanyard {
    fill: none;
    stroke: #e8380d;
    stroke-width: 2.4;
    stroke-linecap: round;
  }

  &-badge {
    fill: #fff;
    stroke: var(--color-poster-ink);
    stroke-width: 1.5;

    &-stripe {
      fill: #e8380d;
    }
  }

  &-eye {
    fill: var(--color-poster-ink);
  }

  &-shine {
    fill: #fff;
  }

  &-blush {
    fill: #ff8fa3;
    opacity: 0.55;
  }

  &-mouth {
    fill: #d9473a;
    stroke: var(--color-poster-ink);
    stroke-width: 1.6;
    stroke-linejoin: round;
  }

  // Arm strokes: a wider ink stroke underneath gives the colour an outline.
  &-limb-ink {
    fill: none;
    stroke: var(--color-poster-ink);
    stroke-width: 14;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  &-limb {
    fill: none;
    stroke-width: 9.5;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  &-sleeve {
    fill: none;
    stroke-width: 10;
    stroke-linecap: round;
  }

  &-fingers {
    fill: none;
    stroke: var(--color-poster-ink);
    stroke-width: 2;
    stroke-linecap: round;
  }

  // Wave from the shoulder: the arm's bounding box starts at the shoulder, so
  // its bottom-left corner is the pivot.
  &-arm {
    transform-box: fill-box;
    transform-origin: 0% 100%;
    animation: chibi-wave 1.1s ease-in-out infinite alternate;
  }

  &-eyes {
    transform-box: fill-box;
    transform-origin: center;
    animation: chibi-blink 4.5s ease-in-out infinite;
  }
}

@keyframes chibi-wave {
  from {
    transform: rotate(-14deg);
  }
  to {
    transform: rotate(16deg);
  }
}

@keyframes chibi-blink {
  0%,
  92%,
  100% {
    transform: scaleY(1);
  }
  95% {
    transform: scaleY(0.1);
  }
}
</style>
