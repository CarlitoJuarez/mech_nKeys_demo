
<template>
  <div
    :class="cn('glow-card relative inline-flex', props.class)"
    :style="styleVars"
  >
    <div class="glow-card-inner relative w-full h-full rounded-[inherit]">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";

interface Props {
  borderRadius?: number;
  color?: string | Array<string>;
  borderWidth?: number;
  duration?: number;
  class?: HTMLAttributes["class"];
}

const props = withDefaults(defineProps<Props>(), {
  borderRadius: 10,
  color: ["#22d3ee", "#a855f7", "#ec4899"],
  borderWidth: .2,
  duration: 80,
});

const styleVars = computed(() => {
  return {
    "--border-radius": `${props.borderRadius}px`,
    "--border-width": `${props.borderWidth}px`,
    "--duration": `${props.duration}s`,
    "--border-colors": Array.isArray(props.color)
      ? props.color.join(",")
      : props.color,
  };
});
</script>

<style scoped lang="scss">
.glow-card {
  border-radius: var(--border-radius);
  overflow: hidden;
}

/* Glow layer only children are not masked */



.glow-card::before {
  content: "";
  position: absolute;

  /* bottom-only strip */
  left: 0;
  right: 0;
  bottom: 0;
  height: calc(var(--border-width) * 10); // adjust thickness

  /* match parent's bottom border radius, zero-out top */
  border-bottom-left-radius: var(--border-radius);
  border-bottom-right-radius: var(--border-radius);
  border-top-left-radius: 0;
  border-top-right-radius: 0;

  background-image: radial-gradient(
    circle,
    transparent,
    var(--border-colors),
    transparent
  );
  background-size: 300% 300%;
  pointer-events: none;
  z-index: 100;

  animation: glow var(--duration) ease-in-out infinite alternate;

  /* ensure the glow doesn't spill outside rounded edges */
  overflow: hidden;
}

/* ensure slot content is above the glow */
.glow-card-inner {
  position: relative;
  border-radius: inherit;
  z-index: 1;
}

@keyframes glow {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}
</style>
