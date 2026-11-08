<script setup lang="ts">
import { computed } from "vue";

import AppTitle from "@/components/AppTitle.vue";
import FrozenBanner from "@/components/FrozenBanner.vue";
import MovementsTicker from "@/components/MovementsTicker.vue";
import ProjectorPodium from "@/components/projector/ProjectorPodium.vue";
import QrCard from "@/components/projector/QrCard.vue";
import RankingBars from "@/components/projector/RankingBars.vue";
import { scoreboard } from "@/socket";

const frozen = computed(() => scoreboard.value?.frozen === true);
</script>

<template>
  <div class="projector bg-slate-900 text-slate-50">
    <header class="projector__header">
      <h1 class="projector__title"><AppTitle /></h1>
      <FrozenBanner variant="projector" />
    </header>

    <main class="projector__body">
      <div class="projector__main frost-target" :class="{ frost: frozen }">
        <ProjectorPodium class="projector__podium" />
        <RankingBars class="projector__ranking" />
      </div>
      <div class="projector__side">
        <MovementsTicker variant="projector" :limit="8" class="flex-1" />
        <QrCard />
      </div>
    </main>
  </div>
</template>

<style scoped>
/*
 * Everything is sized in --u, about 1vh on a 16:9 screen (1920×1080,
 * 1280×720), so the whole layout scales and never scrolls there.
 */
.projector {
  --u: max(min(1vh, 0.5625vw), 4px);
  display: flex;
  flex-direction: column;
  gap: calc(var(--u) * 2);
  padding: calc(var(--u) * 2.5) calc(var(--u) * 3.5);
  min-height: 100dvh;
}

.projector__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: calc(var(--u) * 2);
  height: calc(var(--u) * 7);
  flex-shrink: 0;
}

.projector__title {
  font-size: calc(var(--u) * 4.4);
  font-weight: 800;
  white-space: nowrap;
}

.projector__body {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1.75fr) minmax(0, 1fr);
  gap: calc(var(--u) * 4);
}

.projector__main,
.projector__side {
  display: flex;
  flex-direction: column;
  min-height: 0;
  gap: calc(var(--u) * 3);
}

.projector__podium {
  flex-shrink: 0;
}

.projector__ranking {
  flex: 1;
}

/* Wide screens: lock to the viewport, no scrolling. */
@media (min-aspect-ratio: 4/3) and (min-width: 1024px) {
  .projector {
    height: 100dvh;
    overflow: hidden;
  }
}

/* Narrow screens (phones): stack and scroll. */
@media (max-width: 1023px) {
  .projector__header {
    flex-direction: column;
    height: auto;
  }
  .projector__title {
    white-space: normal;
    text-align: center;
  }
  .projector__body {
    grid-template-columns: minmax(0, 1fr);
  }
  .projector__ranking {
    min-height: calc(var(--u) * 60);
  }
}
</style>
