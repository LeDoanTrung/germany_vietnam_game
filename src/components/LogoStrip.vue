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
        <svg class="logos-klu-mark" viewBox="0 0 64 52">
          <rect x="3" y="3" width="58" height="46" rx="7" class="logos-klu-box" :filter="`url(#${crayonId})`" />
          <text x="32" y="34" class="logos-klu-text">KLU</text>
        </svg>
        <span class="logos-wordmark">
          <span>Kühne</span>
          <span>Logistics</span>
          <span>University</span>
        </span>
      </div>

      <!-- Learn Logistics by Kühne Foundation -->
      <div class="logos-sticker logos-sticker-learn">
        <!-- One continuous red line, as in the real mark: down the left side,
             along the bottom, back up-left to a point, then up-right into an arrow. -->
        <svg class="logos-learn-mark" viewBox="0 0 44 52">
          <g :filter="`url(#${crayonId})`">
            <path d="M7 5V46H29L13 27L35 9" class="logos-learn-line" />
            <path d="M40 4L29.5 6.5L37.5 14.5Z" class="logos-learn-arrow" />
          </g>
        </svg>
        <span class="logos-learn">
          <span class="logos-learn-title">LEARN<br />LOGISTICS</span>
          <span class="logos-learn-by">by Kühne Foundation</span>
        </span>
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

  &-klu {
    &-mark {
      flex-shrink: 0;
      width: 46px;
      height: 38px;
    }

    &-box {
      fill: var(--klu-red);
      stroke: var(--color-poster-ink);
      stroke-width: 2.5;
    }

    // "KLU" is a white bold serif on the red square, as in the real logo.
    &-text {
      fill: #fff;
      font-family: "Times New Roman", Georgia, "Noto Serif", serif;
      font-weight: 700;
      font-size: 22px;
      letter-spacing: 0.02em;
      text-anchor: middle;
    }
  }

  // "KÜHNE / LOGISTICS / UNIVERSITY": plain sans, regular weight.
  &-wordmark {
    display: flex;
    flex-direction: column;
    font-family: var(--font-display);
    font-weight: 400;
    font-size: 10px;
    line-height: 1.15;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    color: #333;
  }

  &-learn {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    text-align: left;

    &-mark {
      flex-shrink: 0;
      width: 30px;
      height: 38px;
    }

    &-line {
      fill: none;
      stroke: var(--learn-red);
      stroke-width: 3.2;
      stroke-linecap: square;
      stroke-linejoin: miter;
    }

    &-arrow {
      fill: var(--learn-red);
    }

    // The real wordmark is a classic serif in navy, regular weight.
    &-title {
      font-family: "Times New Roman", Georgia, "Noto Serif", serif;
      font-weight: 400;
      font-size: 15px;
      line-height: 1;
      letter-spacing: 0.04em;
      color: var(--learn-navy);
    }

    &-by {
      margin-top: 3px;
      font-family: var(--font-display);
      font-weight: 400;
      font-size: 9.5px;
      color: #444;
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
