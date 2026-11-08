<script setup lang="ts">
import { computed } from "vue";

import AppTitle from "@/components/AppTitle.vue";
import ChartsSection from "@/components/ChartsSection.vue";
import FrozenBanner from "@/components/FrozenBanner.vue";
import MovementsTicker from "@/components/MovementsTicker.vue";
import PodiumSection from "@/components/PodiumSection.vue";
import { scoreboard } from "@/socket";

const frozen = computed(() => scoreboard.value?.frozen === true);
</script>

<template>
  <header
    class="fixed top-0 z-50 flex h-16 w-full items-center justify-center bg-slate-800/20 px-4 backdrop-blur-lg"
  >
    <strong class="text-center text-base font-bold text-slate-50 sm:text-xl"
      ><AppTitle
    /></strong>
  </header>
  <main class="relative z-0 overflow-x-hidden bg-slate-900 p-4 pt-20">
    <FrozenBanner class="mt-2 mb-4" />
    <div class="frost-target" :class="{ frost: frozen }">
      <PodiumSection />
    </div>
    <MovementsTicker class="mb-12" />
    <div class="frost-target" :class="{ frost: frozen }">
      <ChartsSection />
    </div>
  </main>
</template>
