<script setup lang="ts">
import ChartsSection from "./components/ChartsSection.vue";
import PodiumSection from "./components/PodiumSection.vue";
</script>

<template>
  <header
    class="fixed top-0 z-50 flex h-16 w-screen items-center justify-center bg-slate-800/20 backdrop-blur-lg"
  >
    <strong class="text-xl font-bold text-slate-50">Carrera de Carreras</strong>
  </header>
  <main class="relative z-0 overflow-x-hidden bg-slate-900 p-4 pt-20">
    <PodiumSection />
    <ChartsSection />
  </main>
</template>
