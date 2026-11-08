<script setup lang="ts">
import { computed } from "vue";

import { degreeColor, degreeIcon } from "@/degrees";
import { ranking } from "@/ranking";

const rows = computed(() => {
  const max = Math.max(1, ...ranking.value.map((r) => r.points));
  return ranking.value.map((r, i) => ({
    id: r.id,
    place: i + 1,
    name: r.name,
    points: Math.floor(r.points),
    icon: degreeIcon(r.name),
    color: degreeColor(r.name),
    width: `${Math.max(0.5, (Math.max(0, r.points) / max) * 100)}%`,
  }));
});
</script>

<template>
  <section class="ranking" aria-label="Clasificación">
    <TransitionGroup tag="ol" name="ranking" class="ranking__list">
      <li v-for="r in rows" :key="r.name" class="ranking__row">
        <span class="ranking__place">{{ r.place }}</span>
        <img v-if="r.icon" :src="r.icon" alt="" class="ranking__icon" />
        <span v-else class="ranking__icon" />
        <span class="ranking__name">{{ r.name }}</span>
        <span class="ranking__track">
          <span
            class="ranking__bar"
            :style="{ width: r.width, background: r.color }"
          />
        </span>
        <span class="ranking__points">{{ r.points }}</span>
      </li>
    </TransitionGroup>
  </section>
</template>

<style scoped>
.ranking {
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.ranking__list {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: calc(var(--u) * 0.5);
}

.ranking__row {
  display: grid;
  grid-template-columns:
    calc(var(--u) * 3) calc(var(--u) * 3.4) calc(var(--u) * 23)
    1fr calc(var(--u) * 8);
  align-items: center;
  gap: calc(var(--u) * 1.2);
  height: calc(var(--u) * 3.6);
  font-size: calc(var(--u) * 2.3);
  color: #f8fafc;
}

.ranking__place {
  text-align: right;
  color: #94a3b8;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.ranking__icon {
  height: calc(var(--u) * 3);
  width: calc(var(--u) * 3.4);
  object-fit: contain;
}

.ranking__name {
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ranking__track {
  height: 70%;
  border-radius: calc(var(--u) * 0.5);
  background: rgb(30 41 59 / 0.6);
  overflow: hidden;
}

.ranking__bar {
  display: block;
  height: 100%;
  border-radius: inherit;
  transition: width 0.8s ease;
}

.ranking__points {
  text-align: right;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.ranking-move {
  transition: transform 0.8s ease;
}

@media (prefers-reduced-motion: reduce) {
  .ranking__bar,
  .ranking-move {
    transition: none;
  }
}
</style>
