<template>
  <div
    ref="containerRef"
    class="relative size-full overflow-hidden will-change-transform"
    :style="{ background }"
  >
    <canvas
      ref="canvasRef"
      class="absolute inset-0 size-full block"
    />
  </div>
</template>

<script setup lang="ts">
import { useRafFn, templateRef, useDebounceFn } from "@vueuse/core";
import { ref, onMounted, onBeforeUnmount } from "vue";

interface Props {
  background?: string;
  particleColor?: string;
  minSize?: number;
  maxSize?: number;
  speed?: number;
  particleDensity?: number;
}

interface Particle {
  x: number;
  y: number;
  size: number;
  opacity: number;
  vx: number;
  vy: number;
  phase: number;
  phaseSpeed: number;
}

const props = withDefaults(defineProps<Props>(), {
  background: "#0d47a1",
  particleColor: "#ffffff",
  minSize: 1,
  maxSize: 3,
  speed: 4,
  particleDensity: 40,
});

const containerRef = templateRef<HTMLElement | null>("containerRef");
const canvasRef = templateRef<HTMLCanvasElement | null>("canvasRef");
const ctx = ref<CanvasRenderingContext2D | null>(null);
const particles = ref<Particle[]>([]);

// logical (CSS pixel) size
const cssW = ref(0);
const cssH = ref(0);

function resizeCanvas() {
  if (!canvasRef.value || !containerRef.value) return;

  const dpr = window.devicePixelRatio || 1;
  const rect = containerRef.value.getBoundingClientRect();

  cssW.value = Math.ceil(rect.width);
  cssH.value = Math.ceil(rect.height);

  // backing store (device pixels)
  canvasRef.value.width = cssW.value * dpr;
  canvasRef.value.height = cssH.value * dpr;

  // enforce CSS dimensions
  const style = canvasRef.value.style;
  style.width = `${cssW.value}px`;
  style.height = `${cssH.value}px`;

  if (ctx.value) {
    if ("resetTransform" in ctx.value) (ctx.value as any).resetTransform();
    else ctx.value.setTransform(1, 0, 0, 1, 0, 0);
    ctx.value.scale(dpr, dpr); // 1 unit = 1 CSS pixel
  }
}

function generateParticles() {
  const count = props.particleDensity;
  const newParticles: Particle[] = [];

  for (let i = 0; i < count; i++) {
    const baseSpeed = 0.05;
    const speedVariance = Math.random() * 0.3 + 0.7;

    newParticles.push({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * (props.maxSize - props.minSize) + props.minSize,
      opacity: Math.random() * 0.5 + 0.3,
      vx: (Math.random() - 0.5) * baseSpeed * speedVariance * props.speed,
      vy: ((Math.random() - 0.5) * baseSpeed - baseSpeed * 0.3) * speedVariance * props.speed,
      phase: Math.random() * Math.PI * 2,
      phaseSpeed: 0.015,
    });
  }

  particles.value = newParticles;
}

function updateAndDrawParticles() {
  if (!ctx.value) return;

  const w = cssW.value;
  const h = cssH.value;

  ctx.value.clearRect(0, 0, w, h);

  particles.value = particles.value.map((p) => {
    let x = p.x + p.vx;
    let y = p.y + p.vy;

    if (x < -2) x = 102;
    if (x > 102) x = -2;
    if (y < -2) y = 102;
    if (y > 102) y = -2;

    const phase = (p.phase + p.phaseSpeed) % (Math.PI * 2);
    const opacity = 0.3 + (Math.sin(phase) * 0.3 + 0.3);

    ctx.value!.beginPath();
    ctx.value!.arc((x * w) / 100, (y * h) / 100, p.size, 0, Math.PI * 2);
    ctx.value!.fillStyle = `${props.particleColor}${Math.floor(opacity * 255)
      .toString(16)
      .padStart(2, "0")}`;
    ctx.value!.fill();

    return { ...p, x, y, phase, opacity };
  });
}

// handle zoom (DPR) change
let lastDpr = window.devicePixelRatio;
function checkDprChange() {
  if (window.devicePixelRatio !== lastDpr) {
    lastDpr = window.devicePixelRatio;
    resizeCanvas();
  }
  requestAnimationFrame(checkDprChange);
}

const { pause, resume } = useRafFn(updateAndDrawParticles, { immediate: false });
const debouncedResize = useDebounceFn(resizeCanvas, 100);

let resizeObserver: ResizeObserver | undefined;

onMounted(() => {
  if (!canvasRef.value) return;

  ctx.value = canvasRef.value.getContext("2d");
  resizeCanvas();
  generateParticles();

  resizeObserver = new ResizeObserver(resizeCanvas);
  if (containerRef.value) resizeObserver.observe(containerRef.value);

  window.addEventListener("resize", debouncedResize);
  resume();
  checkDprChange(); // start DPR monitor
});

onBeforeUnmount(() => {
  pause();
  if (resizeObserver && containerRef.value) resizeObserver.unobserve(containerRef.value);
  window.removeEventListener("resize", debouncedResize);
});
</script>
