<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import gsap from "gsap";
import { prefersReducedMotion } from "../composables/useReducedMotion";

const props = withDefaults(
  defineProps<{
    text: string;
    as?: string;
    /** Seconds the scramble takes to settle. */
    duration?: number;
    delay?: number;
  }>(),
  { as: "span", duration: 0.9, delay: 0 },
);

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=<>/\\";

const display = ref(props.text);
let tween: gsap.core.Tween | null = null;

const randomGlyph = () => GLYPHS.charAt(Math.floor(Math.random() * GLYPHS.length));

// Characters lock in left to right; the ones still pending show random glyphs.
// Whitespace is kept so the line breaks in the same places throughout.
const play = () => {
  tween?.kill();

  if (prefersReducedMotion()) {
    display.value = props.text;
    return;
  }

  const target = props.text;
  const progress = { value: 0 };

  tween = gsap.to(progress, {
    value: 1,
    duration: props.duration,
    delay: props.delay,
    ease: "power1.inOut",
    onStart: () => {
      display.value = target.replace(/\S/g, randomGlyph);
    },
    onUpdate: () => {
      const chars = Array.from(target);
      const locked = Math.floor(progress.value * chars.length);
      display.value = chars.map((char, index) => (index < locked || /\s/.test(char) ? char : randomGlyph())).join("");
    },
    onComplete: () => {
      display.value = target;
    },
  });
};

onMounted(play);
watch(() => props.text, play);
onBeforeUnmount(() => tween?.kill());
</script>

<template>
  <!-- The real text stays available to screen readers while the visible copy scrambles. -->
  <component :is="props.as" class="scramble-text" :aria-label="props.text">
    <span aria-hidden="true">{{ display }}</span>
  </component>
</template>
