<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { prefersReducedMotion } from "../composables/useReducedMotion";

const COLORS = ["#34bfff", "#81d8ff", "#ffb020", "#3ee08f", "#ff5d6c", "#f2f8ff"];
const COUNT = 140;
const DURATION_MS = 3200;

type Piece = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  spin: number;
  color: string;
  shape: "rect" | "circle";
};

const canvasRef = ref<HTMLCanvasElement | null>(null);
let frame = 0;

onMounted(() => {
  const canvas = canvasRef.value;
  const ctx = canvas?.getContext("2d");
  if (!canvas || !ctx || prefersReducedMotion()) return;

  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const { width, height } = canvas.getBoundingClientRect();
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  ctx.scale(ratio, ratio);

  // Two cannons fire inward from the lower corners.
  const pieces: Piece[] = Array.from({ length: COUNT }, (_, index) => {
    const fromLeft = index % 2 === 0;
    const angle = (fromLeft ? -60 : -120) + (Math.random() - 0.5) * 40;
    const speed = 9 + Math.random() * 8;
    return {
      x: fromLeft ? 0 : width,
      y: height * 0.85,
      vx: Math.cos((angle * Math.PI) / 180) * speed,
      vy: Math.sin((angle * Math.PI) / 180) * speed,
      size: 5 + Math.random() * 6,
      rotation: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.3,
      color: COLORS[index % COLORS.length]!,
      shape: Math.random() > 0.3 ? "rect" : "circle",
    };
  });

  const start = performance.now();

  const tick = (now: number) => {
    const elapsed = now - start;
    ctx.clearRect(0, 0, width, height);
    // Fade everything out over the last third.
    ctx.globalAlpha = Math.max(0, Math.min(1, (DURATION_MS - elapsed) / (DURATION_MS / 3)));

    for (const piece of pieces) {
      piece.vy += 0.32; // gravity
      piece.vx *= 0.985; // air drag
      piece.x += piece.vx;
      piece.y += piece.vy;
      piece.rotation += piece.spin;

      ctx.save();
      ctx.translate(piece.x, piece.y);
      ctx.rotate(piece.rotation);
      ctx.fillStyle = piece.color;
      if (piece.shape === "rect") {
        // Squash horizontally over time so the paper appears to flip.
        ctx.fillRect(-piece.size / 2, -piece.size / 4, piece.size * Math.cos(piece.rotation * 3), piece.size / 2);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, piece.size / 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    if (elapsed < DURATION_MS) frame = requestAnimationFrame(tick);
    else ctx.clearRect(0, 0, width, height);
  };

  frame = requestAnimationFrame(tick);
});

onBeforeUnmount(() => cancelAnimationFrame(frame));
</script>

<template>
  <canvas ref="canvasRef" class="confetti" aria-hidden="true"></canvas>
</template>

<style scoped>
.confetti {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 5;
}
</style>
