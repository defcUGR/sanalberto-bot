<script setup lang="ts">
import { computed, onBeforeUnmount, shallowRef, watch } from "vue";

import { relativeTime, useNow } from "@/composables/useNow";
import { degreeColor, degreeIcon } from "@/degrees";
import { movements, movementsReceived } from "@/socket";

const props = withDefaults(
  defineProps<{
    /** Maximum number of movements shown. */
    limit?: number;
    variant?: "dashboard" | "projector";
  }>(),
  { limit: 8, variant: "dashboard" },
);

/** How long a newly arrived movement stays highlighted. */
const HIGHLIGHT_MS = 5000;

const now = useNow();

// Highlight only movements we had not seen before. Nothing is highlighted on
// the first payload from the server (page load, even if empty) nor when a
// reconnect re-sends the same ids.
const seen = new Set<number>();
let initialized = false;
const fresh = shallowRef<ReadonlySet<number>>(new Set());
const timers = new Set<ReturnType<typeof setTimeout>>();

watch(
  movements,
  (list) => {
    const arrived = list.filter((m) => !seen.has(m.id)).map((m) => m.id);
    arrived.forEach((id) => seen.add(id));
    if (!initialized) {
      initialized = movementsReceived.value;
      return;
    }
    if (!arrived.length) return;
    fresh.value = new Set([...fresh.value, ...arrived]);
    const timer = setTimeout(() => {
      timers.delete(timer);
      const next = new Set(fresh.value);
      arrived.forEach((id) => next.delete(id));
      fresh.value = next;
    }, HIGHLIGHT_MS);
    timers.add(timer);
  },
  { immediate: true },
);

onBeforeUnmount(() => timers.forEach(clearTimeout));

const items = computed(() =>
  movements.value.slice(0, props.limit).map((m) => {
    const amount = Math.abs(m.points);
    return {
      id: m.id,
      at: m.at,
      degree: m.degree,
      icon: degreeIcon(m.degree),
      color: degreeColor(m.degree),
      add: m.type !== "remove",
      // U+2212 MINUS SIGN for removals.
      amount: m.type === "remove" ? `−${amount}` : `+${amount}`,
      when: relativeTime(m.at, now.value),
      fresh: fresh.value.has(m.id),
    };
  }),
);
</script>

<template>
  <section class="ticker" :class="`ticker--${variant}`">
    <h2 class="ticker__title">Últimos movimientos</h2>
    <p v-if="!items.length" class="ticker__empty">Todavía no hay movimientos</p>
    <TransitionGroup v-else tag="ol" name="ticker" class="ticker__list">
      <li
        v-for="m in items"
        :key="m.id"
        class="ticker__item"
        :class="{ 'ticker__item--fresh': m.fresh }"
        :style="{ '--degree-color': m.color }"
      >
        <span
          class="ticker__amount"
          :class="m.add ? 'text-emerald-400' : 'text-rose-400'"
          >{{ m.amount }}</span
        >
        <img v-if="m.icon" :src="m.icon" alt="" class="ticker__icon" />
        <span class="ticker__degree">{{ m.degree }}</span>
        <time class="ticker__time" :datetime="m.at">{{ m.when }}</time>
      </li>
    </TransitionGroup>
  </section>
</template>

<style scoped>
.ticker {
  color: #f8fafc;
}

.ticker__title {
  font-weight: 700;
  color: #cbd5e1;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.ticker__empty {
  color: #94a3b8;
  font-style: italic;
}

.ticker__list {
  display: grid;
  position: relative;
}

.ticker__item {
  display: flex;
  align-items: center;
  min-width: 0;
  background: color-mix(in oklab, #1e293b 70%, transparent);
  border-left: 4px solid var(--degree-color);
  border-radius: 0.375rem;
  transition:
    background-color 0.6s,
    box-shadow 0.6s;
}

.ticker__item--fresh {
  background: color-mix(in oklab, var(--degree-color) 28%, #1e293b);
  box-shadow: 0 0 0 2px var(--degree-color);
  animation: ticker-pulse 1.2s ease-out 2;
}

.ticker__amount {
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  text-align: right;
  flex-shrink: 0;
}

.ticker__icon {
  flex-shrink: 0;
}

.ticker__degree {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
}

.ticker__time {
  flex-shrink: 0;
  color: #94a3b8;
  font-variant-numeric: tabular-nums;
}

/* Dashboard: compact card under the podium. */
.ticker--dashboard {
  margin-inline: auto;
  max-width: 56rem;
}
.ticker--dashboard .ticker__title {
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
}
.ticker--dashboard .ticker__empty {
  font-size: 0.95rem;
}
.ticker--dashboard .ticker__list {
  gap: 0.375rem 0.75rem;
}
@media (min-width: 640px) {
  .ticker--dashboard .ticker__list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
.ticker--dashboard .ticker__item {
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  font-size: 0.95rem;
}
.ticker--dashboard .ticker__amount {
  min-width: 3.5rem;
}
.ticker--dashboard .ticker__icon {
  height: 1.25rem;
}
.ticker--dashboard .ticker__time {
  font-size: 0.8rem;
}

/* Projector: sized with the projector unit (--u, about 1vh at 16:9). */
.ticker--projector {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}
.ticker--projector .ticker__title {
  font-size: calc(var(--u) * 2.2);
  margin-bottom: calc(var(--u) * 1.2);
}
.ticker--projector .ticker__empty {
  font-size: calc(var(--u) * 2.6);
}
.ticker--projector .ticker__list {
  gap: calc(var(--u) * 0.9);
}
.ticker--projector .ticker__item {
  gap: calc(var(--u) * 1.2);
  height: calc(var(--u) * 5.2);
  padding: 0 calc(var(--u) * 1.4);
  font-size: calc(var(--u) * 2.6);
  border-left-width: calc(var(--u) * 0.6);
}
.ticker--projector .ticker__amount {
  min-width: calc(var(--u) * 8);
}
.ticker--projector .ticker__icon {
  height: calc(var(--u) * 3.2);
}
.ticker--projector .ticker__time {
  font-size: calc(var(--u) * 2);
}

/* New items slide in; the rest move down smoothly. */
.ticker-enter-active,
.ticker-move {
  transition:
    transform 0.5s ease,
    opacity 0.5s ease;
}
.ticker-leave-active {
  display: none;
}
.ticker-enter-from {
  opacity: 0;
  transform: translateY(-0.75rem);
}

@keyframes ticker-pulse {
  50% {
    box-shadow: 0 0 0 5px
      color-mix(in oklab, var(--degree-color) 50%, transparent);
  }
}

@media (prefers-reduced-motion: reduce) {
  .ticker-enter-active,
  .ticker-move,
  .ticker__item {
    transition: none;
  }
  .ticker__item--fresh {
    animation: none;
  }
}
</style>
