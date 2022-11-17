<script setup lang="ts">
import ChartsSection from "./components/ChartsSection.vue";
import PodiumSection from "./components/PodiumSection.vue";
</script>

<template>
  <header
    class="fixed top-0 z-50 w-screen h-16 bg-slate-800 bg-opacity-20 backdrop-filter backdrop-blur-lg flex justify-center items-center"
  >
    <strong class="text-slate-50 text-xl font-bold">Carrera de Carreras</strong>
  </header>
  <main class="bg-slate-900 z-0 relative p-4 pt-20 overflow-x-hidden">
    <PodiumSection></PodiumSection>
    <ChartsSection></ChartsSection>
  </main>
</template>

<style scoped></style>
