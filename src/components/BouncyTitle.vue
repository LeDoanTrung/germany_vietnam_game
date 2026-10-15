<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import gsap from "gsap";
import { prefersReducedMotion } from "../composables/useReducedMotion";

const props = withDefaults(defineProps<{ text: string; as?: string }>(), { as: "h1" });

// Each letter gets a small fixed tilt so the word looks hand-lettered.
const TILTS = [-6, 4, -3, 5, -4, 3, -5, 2, 6, -2];

const words = computed(() =>
  props.text.split(" ").map((word, wordIndex) =>
    Array.from(word).map((char, charIndex) => ({ char, tilt: TILTS[(wordIndex * 3 + charIndex) % TILTS.length]! })),
  ),
);

const rootRef = ref<HTMLElement | null>(null);

onMounted(() => {
  const letters = rootRef.value?.querySelectorAll<HTMLElement>(".bouncy-title-letter");
  if (!letters?.length || prefersReducedMotion()) return;

  // Letters drop in one after another and land with a bounce.
  gsap.fromTo(
    letters,
    { y: -70, opacity: 0, scale: 0.4 },
    { y: 0, opacity: 1, scale: 1, duration: 0.7, ease: "back.out(2.4)", stagger: 0.06, delay: 0.15 },
  );
});
</script>

<template>
  <component :is="props.as" ref="rootRef" class="bouncy-title" :aria-label="props.text">
    <span v-for="(word, wordIndex) in words" :key="wordIndex" class="bouncy-title-word" aria-hidden="true">
      <span
        v-for="(letter, letterIndex) in word"
        :key="letterIndex"
        class="bouncy-title-letter"
        :style="{ '--tilt': `${letter.tilt}deg`, '--wave-delay': `${(wordIndex * 4 + letterIndex) * 0.12}s` }"
        >{{ letter.char }}</span
      >
    </span>
  </component>
</template>

<style scoped lang="scss">
.bouncy-title {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0 0.3em;
  margin: 0;
  font-family: var(--font-poster);
  font-weight: 800;
  font-size: clamp(44px, 13vw, 62px);
  line-height: 1;
  letter-spacing: 0.01em;
  text-transform: uppercase;
  color: var(--color-poster-red);

  &-word {
    display: inline-flex;
    white-space: nowrap;
  }

  &-letter {
    display: inline-block;
    // An 8-direction ink outline plus a hard drop shadow — the poster's cartoon lettering.
    text-shadow:
      -2px -2px 0 var(--color-poster-ink),
      2px -2px 0 var(--color-poster-ink),
      -2px 2px 0 var(--color-poster-ink),
      2px 2px 0 var(--color-poster-ink),
      0 -2px 0 var(--color-poster-ink),
      0 2px 0 var(--color-poster-ink),
      -2px 0 0 var(--color-poster-ink),
      2px 0 0 var(--color-poster-ink),
      3px 6px 0 var(--color-poster-ink);
    transform: rotate(var(--tilt));
    animation: bouncy-title-wave 2.8s ease-in-out var(--wave-delay) infinite;
  }
}

// A lazy ripple through the word after it has landed.
@keyframes bouncy-title-wave {
  0%,
  70%,
  100% {
    translate: 0 0;
  }
  80% {
    translate: 0 -6px;
  }
}
</style>
