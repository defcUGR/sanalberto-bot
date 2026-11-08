<script setup lang="ts">
import { scoreboard } from "@/socket";
</script>

<template>
  <span
    >Carrera de Carreras<template v-if="scoreboard">
      · San Alberto {{ scoreboard.year }}</template
    ></span
  >
</template>
