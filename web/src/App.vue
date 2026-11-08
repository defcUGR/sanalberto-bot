<script setup lang="ts">
import RevealCeremony from "./components/RevealCeremony.vue";
import DashboardView from "./views/DashboardView.vue";
import ProjectorView from "./views/ProjectorView.vue";

// The backend falls back to index.html for unknown paths, so a tiny check on
// the path is enough: no router needed for two screens.
const isProjector =
  window.location.pathname.replace(/\/+$/, "").toLowerCase() === "/proyector";
</script>

<template>
  <ProjectorView v-if="isProjector" />
  <DashboardView v-else />
  <RevealCeremony />
</template>
