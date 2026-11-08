<script setup lang="ts">
import { computed } from "vue";

import { degreeIcon } from "@/degrees";
import { ranking } from "@/ranking";

const step = (place: number, medal: string, height: number, color: string) => {
  const row = ranking.value[place];
  return {
    medal,
    height: `calc(var(--u) * ${height})`,
    color,
    name: row?.name ?? "Cargando...",
    points: row ? Math.floor(row.points) : null,
    icon: row ? degreeIcon(row.name) : undefined,
  };
};

// Visual order: 2nd, 1st, 3rd (same colours as the dashboard podium).
const steps = computed(() => [
  step(1, "🥈", 13, "#9ca3af"),
  step(0, "🥇", 18, "#f59e0b"),
  step(2, "🥉", 9, "#854d0e"),
]);
</script>

<template>
  <section class="podium" aria-label="Podio">
    <div v-for="(s, i) in steps" :key="i" class="podium__step">
      <p class="podium__name">
        <img v-if="s.icon" :src="s.icon" alt="" class="podium__icon" />{{
          s.name
        }}
      </p>
      <p v-if="s.points !== null" class="podium__points">
        {{ s.points }} puntos
      </p>
      <div
        class="podium__block"
        :style="{ height: s.height, background: s.color }"
      >
        <span class="podium__medal">{{ s.medal }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.podium {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: calc(var(--u) * 1.4);
  color: #f8fafc;
}

.podium__step {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: calc(var(--u) * 30);
}

.podium__name {
  display: flex;
  align-items: center;
  gap: calc(var(--u) * 1);
  font-size: calc(var(--u) * 3.2);
  font-weight: 700;
  white-space: nowrap;
}

.podium__icon {
  height: calc(var(--u) * 3.6);
}

.podium__points {
  font-size: calc(var(--u) * 2.2);
  color: #cbd5e1;
  font-variant-numeric: tabular-nums;
  margin-bottom: calc(var(--u) * 0.8);
}

.podium__block {
  width: 100%;
  display: flex;
  justify-content: center;
  transition: height 0.8s ease;
}

.podium__medal {
  font-size: calc(var(--u) * 6);
  line-height: 1.2;
}

@media (prefers-reduced-motion: reduce) {
  .podium__block {
    transition: none;
  }
}
</style>
