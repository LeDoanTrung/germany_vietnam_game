<script setup lang="ts">
import { useId } from "vue";

// The client's two logos, redrawn by hand as cartoon stickers so they match the
// poster theme (requested by the client: "make the logos cartoon too").
// Only the shapes get the crayon filter; the small text stays crisp to read.

const crayonId = `logo-crayon-${useId()}`;
</script>

<template>
  <div class="logos" aria-label="Kühne Logistics University · Learn Logistics by Kühne Foundation" role="img">
    <svg class="logos-defs" aria-hidden="true">
      <filter :id="crayonId" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="6" result="noise" />
        <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.6 1.7" result="grain" />
        <feComposite in="SourceGraphic" in2="grain" operator="in" result="grainy" />
        <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="3" result="warp" />
        <feDisplacementMap in="grainy" in2="warp" scale="2" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>

    <div class="logos-row" aria-hidden="true">
      <!-- Kühne Logistics University -->
      <div class="logos-sticker logos-sticker-klu">
        <!-- Whole logo in one SVG, measured off the real logo: KLU sits at the
             bottom of the red square, the three wordmark lines are left-aligned
             and UNIVERSITY shares KLU's baseline. textLength keeps proportions. -->
        <svg class="logos-klu-logo" viewBox="28 18 330 116">
          <rect x="35" y="22" width="123" height="106" rx="10" class="logos-klu-box" :filter="`url(#${crayonId})`" />
          <text x="50" y="113" textLength="93" lengthAdjust="spacingAndGlyphs" class="logos-klu-text">KLU</text>
          <text x="187" y="58" textLength="72" lengthAdjust="spacingAndGlyphs" class="logos-klu-word">KÜHNE</text>
          <text x="187" y="86" textLength="141" lengthAdjust="spacingAndGlyphs" class="logos-klu-word">LOGISTICS</text>
          <text x="187" y="113" textLength="163" lengthAdjust="spacingAndGlyphs" class="logos-klu-word">UNIVERSITY</text>
        </svg>
      </div>

      <!-- Learn Logistics by Kühne Foundation -->
      <div class="logos-sticker logos-sticker-learn">
        <!-- Whole logo in one SVG, coordinates measured off the real logo so the
             proportions match: mark top level with the cap height of LEARN, mark
             bottom on the LOGISTICS baseline. textLength pins each line to its
             measured width, so a missing font can't change the proportions. -->
        <svg class="logos-learn-logo" viewBox="66 22 640 242">
          <g :filter="`url(#${crayonId})`">
            <!-- One continuous red line: down, along the bottom, back up-left, up-right into the arrow -->
            <path d="M79 34V158H192L123 92L164 49" class="logos-learn-line" />
            <path d="M181 32L172 57L156 42Z" class="logos-learn-arrow" />
          </g>
          <text x="245" y="92" textLength="250" lengthAdjust="spacingAndGlyphs" class="logos-learn-word">LEARN</text>
          <text x="245" y="160" textLength="425" lengthAdjust="spacingAndGlyphs" class="logos-learn-word">LOGISTICS</text>
          <text x="248" y="252" textLength="442" lengthAdjust="spacingAndGlyphs" class="logos-learn-by">by Kühne Foundation</text>
        </svg>
      </div>
    </div>

    <!-- Tagline as a red tape label across the two stickers -->
    <p class="logos-tag" aria-hidden="true">Leading with an Operations Mindset</p>
  </div>
</template>

<style scoped lang="scss">
.logos {
  --klu-red: #e8380d;
  --learn-navy: #22345e;
  --learn-red: #c8102e;

  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;

  &-defs {
    position: absolute;
    width: 0;
    height: 0;
  }

  &-row {
    display: flex;
    justify-content: center;
    gap: 10px;
    width: 100%;
  }

  // White paper stickers with an ink outline and a hard offset shadow.
  &-sticker {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 7px 10px 7px 8px;
    border: 2.5px solid var(--color-poster-ink);
    border-radius: 14px 18px 12px 20px / 18px 12px 20px 14px;
    background: #fff;
    box-shadow: 3px 4px 0 var(--color-poster-ink);
    animation: logos-pop 0.6s var(--ease-out-back) both;

    &-klu {
      transform: rotate(-2.5deg);
    }

    &-learn {
      transform: rotate(2deg);
      animation-delay: 0.12s;
    }
  }

  // Sizes are in the logo's own measured units (see the viewBox).
  &-klu {
    &-logo {
      display: block;
      height: 44px;
      width: auto;
    }

    &-box {
      fill: var(--klu-red);
    }

    // "KLU" is a white bold serif at the bottom of the red square.
    &-text {
      fill: #fff;
      font-family: "Times New Roman", Times, Georgia, "Noto Serif", serif;
      font-weight: 700;
      font-size: 43px;
    }

    // "KÜHNE / LOGISTICS / UNIVERSITY": plain sans, regular weight, left-aligned.
    &-word {
      fill: #3a3a3a;
      font-family: Arial, "Helvetica Neue", Helvetica, var(--font-display), sans-serif;
      font-weight: 400;
      font-size: 26px;
    }
  }

  // Sizes are in the logo's own measured units (see the viewBox).
  &-learn {
    &-logo {
      display: block;
      height: 44px;
      width: auto;
    }

    &-line {
      fill: none;
      stroke: var(--learn-red);
      stroke-width: 7;
      stroke-linecap: square;
      stroke-linejoin: miter;
    }

    &-arrow {
      fill: var(--learn-red);
    }

    // The real wordmark is a classic serif in navy, regular weight.
    &-word {
      fill: var(--learn-navy);
      font-family: "Times New Roman", Times, Georgia, "Noto Serif", serif;
      font-weight: 400;
      font-size: 82px;
    }

    &-by {
      fill: #3d3d3d;
      font-family: var(--font-display);
      font-weight: 400;
      font-size: 42px;
    }
  }

  // Red tape stuck across the stickers.
  &-tag {
    position: relative;
    z-index: 1;
    margin-top: -6px;
    padding: 4px 14px 5px;
    border: 2px solid var(--color-poster-ink);
    border-radius: 6px 10px 6px 10px;
    background: var(--klu-red);
    box-shadow: 2px 3px 0 var(--color-poster-ink);
    color: #fff;
    font-family: var(--font-hand);
    font-weight: 700;
    font-size: 12px;
    transform: rotate(-1.5deg);
    animation: logos-pop 0.6s var(--ease-out-back) 0.25s both;
  }
}

@keyframes logos-pop {
  from {
    scale: 0.6;
    opacity: 0;
  }
  to {
    scale: 1;
    opacity: 1;
  }
}
</style>
