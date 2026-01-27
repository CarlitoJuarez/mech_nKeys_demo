<template>
  <div
    class="relative flex w-full flex-col items-center justify-center gap-[10vh]
           rounded-md bg-white dark:bg-black"
  >
    <!-- BACKGROUND -->
    <div class="absolute inset-0 min-h-screen w-full overflow-hidden">
      <Sparkles
        background="transparent"
        :min-size="0.8"
        :max-size="2"
        :particle-density="800"
        class="size-full"
        :particle-color="particlesColor"
      />
    </div>

    <!-- LOGO -->
    <img
      ref="logo_img"
      :src="logo"
      alt="logo"
      class="object-contain h-[30vh] ml-[-1rem] mt-[18vh]
             transition-opacity duration-[800ms]"
    />

    <h1
      class="logo_font relative z-20 text-center text-[56px]
             font-[700] tracking-tight text-white"
    >
      mech_nKeys
    </h1>

    <p
      class="relative z-20 mb-[-10vh] text-center text-sm
             text-neutral-500 transition-opacity duration-[1500ms]"
      :class="{ 'opacity-0': faded || done }"
    >
      press any key
    </p>

    <h2
      class="relative z-20 mb-[4vh] text-center text-[16px]
             leading-[1.9] text-neutral-400"
    >
      A hobbyist space for custom keyboards.<br />
      Create. Share. Trade safely.
    </h2>

    <!-- GRID -->
    <div class="viewport m-[10vw] mb-[0] mt-[4rem] grid grid-cols-4 grid-rows-4 gap-10">

      <!-- VISION -->
      <GlowCard
        :color="isDark ? ['#4b29bb', '#0033ff'] : ['#ff66cc', '#ff0033']"
        :radius="22"
        :width="4"
        :duration="8"
        class="row-start-1 col-start-1 col-end-3"
      >
        <SpotlightCard
          class="card"
          :gradient-color="isDark ? '#2a2a2a' : '#d6d6d6'"
        >
          <span class="eyebrow">About</span>

          <h3 class="title mt-2">Vision & Mission</h3>

          <!-- <ul class="list-none space-y-3 mt-4"> -->
          <!--   <li>We celebrate individuality and self-expression through creation.</li> -->
          <!--   <li>Our goal is to make the custom keyboard market accessible and safe.</li> -->
          <!-- </ul> -->

          <div class="space-y-4">
            <span>-   </span>
            <p class="body">
              We celebrate individuality and expression of self through the process of creation.
            </p>
            <p class="body">
              Our goal is to make the custom keyboard market more accessible and safe.
            </p>
          </div>

        </SpotlightCard>
      </GlowCard>

      <!-- CURRENT STATE -->
      <GlowCard
        :color="isDark ? ['#4b29bb', '#0033ff'] : ['#ff66cc', '#ff0033']"
        :radius="22"
        :width="4"
        :duration="8"
        class="row-start-1 col-start-3 col-end-5"
      >
        <SpotlightCard
          class="card"
          :gradient-color="isDark ? '#2a2a2a' : '#d6d6d6'"
        >
          <span class="eyebrow">Problem</span>

          <h3 class="title mt-2">Current State</h3>

          <div class="space-y-4">
            <span>-   </span>
            <p class="body">Fragmented and opaque platforms</p>
            <p class="body">No reliable safe-trade for the after-market</p>
          </div>
        </SpotlightCard>
      </GlowCard>

      <!-- PROCESS -->
      <GlowCard
        :color="isDark ? ['#4b29bb', '#0033ff'] : ['#ff66cc', '#ff0033']"
        :radius="22"
        :width="4"
        :duration="8"
        class="row-start-2 row-end-4 col-start-2 col-end-5"
      >
        <SpotlightCard
          class="card"
          :gradient-color="isDark ? '#2a2a2a' : '#d6d6d6'"
        >
          <span class="eyebrow">Approach</span>

          <h3 class="title mt-2">Two-Step Process</h3>

          <span>-   </span>
          <div class="space-y-8 mt-6">
            <div>
              <p class="step mb-2">1. Build Community</p>
              <p class="body">
                Discover builds, discuss layouts, and showcase collections.
              </p>
                <p style="font-size: 10px">[ in progress ..]</p>
            </div>

            <div>
              <p class="step mb-2">2. Enable Safe Trade</p>
              <p class="body">
                Implement transparent and trusted aftermarket transactions.
              </p>
              <p style="font-size: 10px">[ pending ..]</p>
            </div>
          </div>
        </SpotlightCard>
      </GlowCard>

      <!-- DISCORD -->
      <GlowCard
        :radius="22"
        :width="4"
        :duration="1"
        class="row-start-2 row-end-4 col-start-1"
      >
        <SpotlightCard
          class="card items-center justify-center text-center"
          :gradient-color="isDark ? '#2a2a2a' : '#d6d6d6'"
        >
          <p class="font-[600] mb-[1.4rem] text-[38px]">
            Wanna find out more?
          </p>

          <!-- ORIGINAL BUTTON -->
      <a href="${discord_link}" target="_blank"
            class="inline-flex justify-center items-center gap-1 w-[4rem]
                   bg-[linear-gradient(140deg,#FF6B01,#F5B200)]
                   border-0 text-white text-base font-light
                   rounded px-[0.55rem] py-1 shrink-0"
          >
            <img :src="discord" class="w-[1rem] h-[1rem]" />
            Join
          </a>
        </SpotlightCard>
      </GlowCard>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { useColorMode } from "@vueuse/core";

import Sparkles from "./partials/Sparkles.vue";
import SpotlightCard from "./partials/SpotlightCard.vue";
import GlowCard from "./partials/GlowCard.vue";

import logo from "@/assets/imgs/logo.png";
import discord from "@/assets/imgs/discord.png";

let discord_link = import.meta.env.DISCORD_LINK;
if (!discord_link) {
  discord_link = "https://www.discord.com";
}


const mode = useColorMode();
const isDark = computed(() => mode.value === "dark");

const particlesColor = computed(() =>
  isDark.value ? "#FFFFFF" : "#000000"
);

const faded = ref(true);
const done = ref(false);
const keyCount = ref(0);
const logo_img = ref<HTMLElement | null>(null);

let fadeInterval: number | undefined;

const handleKey = () => {
  if (done.value) return;
  keyCount.value++;
  if (keyCount.value >= 5) {
    done.value = true;
    faded.value = true;
    if (fadeInterval) clearInterval(fadeInterval);
  }
};

onMounted(() => {
  fadeInterval = window.setInterval(() => {
    if (!done.value) faded.value = !faded.value;
  }, 4000);

  window.addEventListener("keydown", handleKey);
  window.addEventListener("keydown", () => {
    if (logo_img.value) logo_img.value.style.opacity = "0";
  });
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleKey);
  if (fadeInterval) clearInterval(fadeInterval);
});
</script>

<style scoped lang="css">
.logo_font {
  font-family: var(--font_logo);
}

.card {
  padding: 2rem;
  display: flex;
  justify-content: center;
  flex-direction: column;
  gap: 1.25rem;
  backdrop-filter: blur(10px);
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.22em;
  font-size: 11px;
  opacity: 0.55;
}

.title {
  font-size: 28px;
  font-weight: 600;
  line-height: 1.2;
}

.body {
  font-size: 15px;
  line-height: 1.75;
  opacity: 0.85;
}

.step {
  font-weight: 500;
}

.list {
  list-style: disc;
  padding-left: 1.25rem;
  opacity: 0.85;
}

@media (max-width: 1020px) {
  .viewport {
    display: flex !important;
    flex-direction: column !important;
    gap: 3.5em;
    margin-bottom: 20vh;
  }
}
</style>
