<script setup lang="ts">
import { computed } from "vue";

import { scoreboard } from "@/socket";

withDefaults(defineProps<{ variant?: "dashboard" | "projector" }>(), {
  variant: "dashboard",
});

const frozen = computed(() => scoreboard.value?.frozen === true);
</script>

<template>
  <Transition name="frozen-banner">
    <div
      v-if="frozen"
      role="status"
      class="frozen-banner"
      :class="`frozen-banner--${variant}`"
    >
      <span aria-hidden="true" class="frozen-banner__icon">❄️</span>
      <span
        ><strong>Marcador congelado:</strong> los resultados se revelarán al
        final</span
      >
    </div>
  </Transition>
</template>

<style scoped>
.frozen-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6em;
  color: #e0f2fe;
  background: linear-gradient(
    90deg,
    rgb(14 116 144 / 0.55),
    rgb(56 189 248 / 0.35),
    rgb(14 116 144 / 0.55)
  );
  border: 1px solid rgb(186 230 253 / 0.6);
  box-shadow:
    0 0 24px rgb(56 189 248 / 0.25),
    inset 0 0 18px rgb(224 242 254 / 0.15);
  border-radius: 0.75rem;
  text-align: center;
  text-wrap: balance;
}

.frozen-banner__icon {
  font-size: 1.4em;
  line-height: 1;
}

.frozen-banner--dashboard {
  max-width: 56rem;
  margin-inline: auto;
  padding: 0.75rem 1rem;
  font-size: 1.05rem;
}

.frozen-banner--projector {
  padding: calc(var(--u) * 0.9) calc(var(--u) * 2);
  font-size: calc(var(--u) * 2.3);
  white-space: nowrap;
}

.frozen-banner-enter-active,
.frozen-banner-leave-active {
  transition:
    opacity 0.5s ease,
    transform 0.5s ease;
}
.frozen-banner-enter-from,
.frozen-banner-leave-to {
  opacity: 0;
  transform: translateY(-0.5rem);
}

@media (prefers-reduced-motion: reduce) {
  .frozen-banner-enter-active,
  .frozen-banner-leave-active {
    transition: none;
  }
}
</style>
