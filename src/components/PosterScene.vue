<script setup lang="ts">
import { useId } from "vue";

// Hand-drawn backdrop for the home screen, in the style of the client's event
// poster: crayon textures, wobbly ink lines, a German port on the left and a
// Vietnamese skyline on the right. Everything is drawn here — no images.

const uid = useId();
const crayonId = `crayon-${uid}`;
const crayonBottomId = `crayon-bottom-${uid}`;

// Container colours on the ship deck.
const CONTAINERS = [
  { x: 52, y: 120, fill: "#ef4a24" },
  { x: 66, y: 120, fill: "#ffd23f" },
  { x: 80, y: 120, fill: "#3fae5a" },
  { x: 94, y: 120, fill: "#2a55c9" },
  { x: 108, y: 120, fill: "#ef4a24" },
  { x: 59, y: 111, fill: "#6fa8e8" },
  { x: 73, y: 111, fill: "#ef4a24" },
  { x: 87, y: 111, fill: "#ffd23f" },
  { x: 101, y: 111, fill: "#3fae5a" },
];
</script>

<template>
  <div class="poster" aria-hidden="true">
    <!-- Sky decorations -->
    <svg class="poster-top" viewBox="0 0 400 210" preserveAspectRatio="xMidYMin meet">
      <defs>
        <!-- Grainy crayon fill + slightly shaky edges. -->
        <filter :id="crayonId" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" result="noise" />
          <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2 1.75" result="grain" />
          <feComposite in="SourceGraphic" in2="grain" operator="in" result="grainy" />
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="9" result="warp" />
          <feDisplacementMap in="grainy" in2="warp" scale="3" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>

      <!-- Globe -->
      <g :filter="`url(#${crayonId})`" class="poster-globe">
        <circle cx="58" cy="74" r="46" class="poster-globe-sea" />
        <path
          d="M30 52c8-6 18-4 22 3s-3 10 2 15 12 3 10 11-12 6-16 2-11-5-15-12-9-13-3-19Z"
          class="poster-globe-land"
        />
        <path d="M70 46c7-3 15 1 17 8s-4 9-9 9-12 5-14-2 0-12 6-15Z" class="poster-globe-land" />
        <path d="M64 92c6-2 13 1 14 7s-6 9-11 6-8-11-3-13Z" class="poster-globe-land" />
        <ellipse cx="58" cy="74" rx="20" ry="46" class="poster-globe-line" />
        <ellipse cx="58" cy="74" rx="38" ry="46" class="poster-globe-line" />
        <path d="M14 60h88M12 74h92M14 88h88" class="poster-globe-line" />
        <circle cx="58" cy="74" r="46" class="poster-globe-rim" />
      </g>

      <!-- Sun -->
      <g class="poster-sun">
        <g class="poster-sun-rays" :filter="`url(#${crayonId})`">
          <path
            v-for="index in 10"
            :key="index"
            d="M345 22v-12"
            :transform="`rotate(${index * 36} 345 58)`"
          />
        </g>
        <circle cx="345" cy="58" r="22" class="poster-sun-face" :filter="`url(#${crayonId})`" />
      </g>

      <!-- Birds -->
      <g class="poster-birds">
        <path class="poster-bird" d="M300 112q5-6 10 0q5-6 10 0" />
        <path class="poster-bird poster-bird-late" d="M322 98q4-5 8 0q4-5 8 0" />
      </g>

      <!-- Clouds -->
      <g class="poster-cloud poster-cloud-a" :filter="`url(#${crayonId})`">
        <path d="M30 168c-2-9 9-14 15-8 3-9 17-10 20-1 9-2 14 9 6 13H34c-3 0-5-2-4-4Z" />
      </g>
      <g class="poster-cloud poster-cloud-b" :filter="`url(#${crayonId})`">
        <path d="M318 176c-2-8 8-12 13-7 3-8 15-9 18-1 8-2 12 8 5 11h-32c-3 0-4-1-4-3Z" />
      </g>
    </svg>

    <!-- Ground scene: port, ship, skyline, water, flags -->
    <svg class="poster-bottom" viewBox="0 0 400 200" preserveAspectRatio="xMidYMax meet">
      <defs>
        <filter :id="crayonBottomId" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="2" result="noise" />
          <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2 1.75" result="grain" />
          <feComposite in="SourceGraphic" in2="grain" operator="in" result="grainy" />
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="5" result="warp" />
          <feDisplacementMap in="grainy" in2="warp" scale="2.5" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>

      <!-- Left: German harbour city -->
      <g :filter="`url(#${crayonBottomId})`" class="poster-city">
        <!-- Concert hall: brick base, glass top with a wavy roof -->
        <rect x="2" y="104" width="44" height="40" class="poster-brick" />
        <path d="M2 104V78q8-10 14-2 7-12 14-2 8-10 16 2v28Z" class="poster-glass" />
        <path d="M6 112h36M6 122h36M6 132h36" class="poster-ink-thin" />
        <!-- Town hall with spire -->
        <rect x="48" y="86" width="18" height="58" class="poster-hall" />
        <path d="M48 86l9-14 9 14Z" class="poster-roof" />
        <path d="M57 72V40" class="poster-ink" />
        <path d="M54 58l3-18 3 18Z" class="poster-roof" />
        <!-- Harbour cranes -->
        <path d="M118 144V70l26-8M118 80h30M128 144l-10-30" class="poster-crane" />
        <path d="M150 144V84l20-6M150 92h22" class="poster-crane" />
      </g>

      <!-- Right: Vietnamese skyline -->
      <g :filter="`url(#${crayonBottomId})`" class="poster-city">
        <rect x="262" y="104" width="22" height="40" class="poster-tower-low" />
        <rect x="288" y="90" width="18" height="54" class="poster-tower" />
        <rect x="356" y="96" width="20" height="48" class="poster-tower" />
        <rect x="378" y="110" width="22" height="34" class="poster-tower-low" />
        <!-- The landmark tower: tapering, with a helipad disc -->
        <path d="M322 144l4-112q4-10 8 0l6 112Z" class="poster-landmark" />
        <ellipse cx="331" cy="66" rx="13" ry="4" class="poster-helipad" />
        <path d="M330 36v-12" class="poster-ink" />
        <path d="M266 112v26M274 112v26M292 98v40M300 98v40M360 104v34M368 104v34" class="poster-ink-thin" />
        <!-- Palms and bushes -->
        <path d="M250 144c0-14 1-26 4-34" class="poster-trunk" />
        <path d="M254 110c-8-6-16-4-20 2M254 110c6-8 14-8 18-3M254 110c-2-8-8-12-14-11M254 110c3-7 9-10 14-8" class="poster-leaf" />
        <path d="M392 144c0-12-1-22-3-28" class="poster-trunk" />
        <path d="M389 116c-7-5-14-3-17 2M389 116c5-7 11-7 15-2" class="poster-leaf" />
        <circle cx="244" cy="140" r="7" class="poster-bush" />
        <circle cx="300" cy="141" r="6" class="poster-bush" />
        <circle cx="350" cy="140" r="7" class="poster-bush" />
      </g>

      <!-- Water -->
      <rect x="0" y="144" width="400" height="56" class="poster-water" :filter="`url(#${crayonBottomId})`" />
      <g class="poster-waves">
        <path d="M-40 160q10-6 20 0t20 0 20 0 20 0 20 0 20 0 20 0 20 0 20 0 20 0 20 0 20 0 20 0 20 0 20 0 20 0 20 0 20 0 20 0 20 0 20 0 20 0 20 0 20 0" />
        <path
          class="poster-waves-slow"
          d="M-40 178q12-6 24 0t24 0 24 0 24 0 24 0 24 0 24 0 24 0 24 0 24 0 24 0 24 0 24 0 24 0 24 0 24 0 24 0 24 0 24 0 24 0"
        />
      </g>

      <!-- Container ship, bobbing on the water -->
      <g class="poster-ship">
        <g :filter="`url(#${crayonBottomId})`">
          <rect
            v-for="(container, index) in CONTAINERS"
            :key="index"
            :x="container.x"
            :y="container.y"
            width="13"
            height="9"
            :fill="container.fill"
            class="poster-container"
          />
          <rect x="116" y="106" width="14" height="23" class="poster-bridge" />
          <path d="M30 129h112l-10 22H42Z" class="poster-hull" />
          <path d="M38 145h98" class="poster-waterline" />
        </g>
      </g>

      <!-- Crossed flags: Vietnam and Germany -->
      <g class="poster-flags" :filter="`url(#${crayonBottomId})`">
        <path d="M190 196l26-62M212 196l-26-62" class="poster-pole" />
        <g class="poster-flag poster-flag-vn">
          <path d="M186 134l-30-4 4 22 30 4Z" fill="#da251d" />
          <path d="M173 136l2 5 5 0-4 3 2 5-5-3-4 3 1-5-4-3 5 0Z" fill="#ffd23f" />
        </g>
        <g class="poster-flag poster-flag-de">
          <path d="M216 134l30-4-1 7-30 4Z" fill="#1d1d1d" />
          <path d="M215 141l30-4-1 7-30 4Z" fill="#dd0000" />
          <path d="M214 148l30-4-1 8-30 4Z" fill="#ffce00" />
        </g>
      </g>
    </svg>
  </div>
</template>

<style scoped lang="scss">
.poster {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;

  // Paper with diagonal pencil hatching, like the poster's coloured-in sky.
  background:
    repeating-linear-gradient(-58deg, rgba(111, 168, 232, 0.16) 0 2px, transparent 2px 6px),
    repeating-linear-gradient(-50deg, rgba(111, 168, 232, 0.12) 0 1px, transparent 1px 13px),
    radial-gradient(circle at 50% 30%, #f7fcff, var(--color-poster-paper) 60%, var(--color-poster-sky));

  &-top,
  &-bottom {
    position: absolute;
    left: 0;
    width: 100%;
  }

  &-top {
    top: 0;
    height: 210px;
  }

  &-bottom {
    bottom: 0;
    height: 200px;
  }

  // Globe
  &-globe {
    &-sea {
      fill: #d8ecfb;
    }

    &-land {
      fill: var(--color-poster-blue-light);
    }

    &-line {
      fill: none;
      stroke: var(--color-poster-blue);
      stroke-width: 1.4;
    }

    &-rim {
      fill: none;
      stroke: var(--color-poster-blue);
      stroke-width: 2.6;
    }
  }

  // Sun
  &-sun {
    &-rays {
      transform-origin: 345px 58px;
      animation: poster-spin 18s linear infinite;

      path {
        stroke: #ffc21a;
        stroke-width: 4;
        stroke-linecap: round;
      }
    }

    &-face {
      fill: var(--color-poster-yellow);
      stroke: #f5a300;
      stroke-width: 2.5;
    }
  }

  &-bird {
    fill: none;
    stroke: var(--color-poster-blue);
    stroke-width: 2;
    stroke-linecap: round;
    transform-box: fill-box;
    transform-origin: center;
    animation: poster-flap 0.9s ease-in-out infinite alternate;

    &-late {
      animation-delay: 0.3s;
    }
  }

  &-cloud {
    path {
      fill: var(--color-poster-blue);
    }

    &-a {
      animation: poster-drift 16s ease-in-out infinite alternate;
    }

    &-b {
      animation: poster-drift 21s ease-in-out infinite alternate-reverse;
    }
  }

  // Ground
  &-brick {
    fill: #e2854f;
    stroke: var(--color-poster-ink);
    stroke-width: 1.5;
  }

  &-glass {
    fill: #9fd0f5;
    stroke: var(--color-poster-ink);
    stroke-width: 1.5;
  }

  &-hall {
    fill: #f2d7a6;
    stroke: var(--color-poster-ink);
    stroke-width: 1.5;
  }

  &-roof {
    fill: #3e9e8f;
    stroke: var(--color-poster-ink);
    stroke-width: 1.5;
    stroke-linejoin: round;
  }

  &-crane {
    fill: none;
    stroke: var(--color-poster-blue);
    stroke-width: 3;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  &-tower {
    fill: #8ec3ef;
    stroke: var(--color-poster-ink);
    stroke-width: 1.5;
  }

  &-tower-low {
    fill: #bfe0f8;
    stroke: var(--color-poster-ink);
    stroke-width: 1.5;
  }

  &-landmark {
    fill: #5d9be0;
    stroke: var(--color-poster-ink);
    stroke-width: 1.8;
    stroke-linejoin: round;
  }

  &-helipad {
    fill: #2a55c9;
    stroke: var(--color-poster-ink);
    stroke-width: 1.5;
  }

  &-ink {
    fill: none;
    stroke: var(--color-poster-ink);
    stroke-width: 1.8;
    stroke-linecap: round;
  }

  &-ink-thin {
    fill: none;
    stroke: rgba(31, 42, 110, 0.45);
    stroke-width: 1;
  }

  &-trunk {
    fill: none;
    stroke: #8a5a2b;
    stroke-width: 3;
    stroke-linecap: round;
  }

  &-leaf {
    fill: none;
    stroke: var(--color-poster-green);
    stroke-width: 3;
    stroke-linecap: round;
  }

  &-bush {
    fill: var(--color-poster-green);
    stroke: #2a7d3e;
    stroke-width: 1.2;
  }

  &-water {
    fill: #4f8fe0;
  }

  &-waves path {
    fill: none;
    stroke: rgba(255, 255, 255, 0.75);
    stroke-width: 2.2;
    stroke-linecap: round;
    animation: poster-waves 3s linear infinite;
  }

  &-waves &-waves-slow {
    stroke: rgba(207, 232, 247, 0.6);
    animation: poster-waves-slow 4.5s linear infinite reverse;
  }

  &-ship {
    transform-box: fill-box;
    transform-origin: center bottom;
    animation: poster-bob 2.6s ease-in-out infinite;
  }

  &-container {
    stroke: var(--color-poster-ink);
    stroke-width: 1;
  }

  &-bridge {
    fill: #fff;
    stroke: var(--color-poster-ink);
    stroke-width: 1.5;
  }

  &-hull {
    fill: var(--color-poster-blue);
    stroke: var(--color-poster-ink);
    stroke-width: 2;
    stroke-linejoin: round;
  }

  &-waterline {
    stroke: var(--color-poster-red);
    stroke-width: 4;
  }

  &-pole {
    stroke: #6b4a2b;
    stroke-width: 3;
    stroke-linecap: round;
  }

  &-flag {
    transform-box: fill-box;
    animation: poster-wave-flag 1.6s ease-in-out infinite alternate;

    &-vn {
      transform-origin: right center;
    }

    &-de {
      transform-origin: left center;
      animation-delay: 0.4s;
    }
  }
}

@keyframes poster-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes poster-flap {
  to {
    transform: scaleY(0.4);
  }
}

@keyframes poster-drift {
  to {
    transform: translateX(26px);
  }
}

// Each wave path repeats every 40 / 48 units, so shifting by exactly one
// period loops without a visible jump.
@keyframes poster-waves {
  to {
    transform: translateX(40px);
  }
}

@keyframes poster-waves-slow {
  to {
    transform: translateX(48px);
  }
}

@keyframes poster-bob {
  0%,
  100% {
    transform: translateY(0) rotate(0);
  }
  50% {
    transform: translateY(2.5px) rotate(-0.8deg);
  }
}

@keyframes poster-wave-flag {
  to {
    transform: skewY(-6deg) scaleX(0.94);
  }
}
</style>
