<script setup lang="ts">
import { computed } from "vue";

import { degreeIcon } from "@/degrees";
import { ranking } from "@/ranking";

interface Step {
  medal: string;
  bar: string;
  name: string;
  icon?: string;
}

const PLACEHOLDER = "Cargando...";

const step = (place: number, medal: string, bar: string): Step => {
  const row = ranking.value[place];
  return row
    ? { medal, bar, name: row.name, icon: degreeIcon(row.name) }
    : { medal, bar, name: PLACEHOLDER };
};

// Visual order: 2nd, 1st, 3rd.
const steps = computed<Step[]>(() => [
  step(1, "🥈", "h-36 bg-gray-400"),
  step(0, "🥇", "h-48 bg-amber-500"),
  step(2, "🥉", "h-24 bg-yellow-800"),
]);
</script>

<template>
  <section class="flex items-end justify-center gap-2 pt-36 pb-12 lg:gap-3">
    <div
      v-for="(s, i) in steps"
      :key="i"
      class="relative w-28 md:w-32 lg:w-48"
      :class="s.bar"
    >
      <p class="absolute top-0 mt-1 w-full text-center text-5xl">
        {{ s.medal }}
      </p>
      <p
        class="absolute -top-16 w-full text-center text-xl font-semibold text-slate-50 lg:text-2xl"
      >
        <img
          v-if="s.icon"
          :src="s.icon"
          :alt="''"
          class="mr-2 mb-1.5 inline h-6"
        />{{ s.name }}
      </p>
    </div>
  </section>
</template>
