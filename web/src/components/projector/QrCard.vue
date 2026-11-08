<script setup lang="ts">
import { renderSVG } from "uqr";

const BOT_URL = "https://t.me/sanalberto_bot";

// Generated locally (no external service); the string is our own output.
const svg = renderSVG(BOT_URL, { ecc: "M", border: 2 });
</script>

<template>
  <aside class="qr">
    <a
      :href="BOT_URL"
      class="qr__code"
      aria-label="Abrir @sanalberto_bot en Telegram"
      v-html="svg"
    ></a>
    <p class="qr__caption">
      Consulta el ranking en Telegram:
      <strong class="text-sky-300">@sanalberto_bot</strong>
    </p>
  </aside>
</template>

<style scoped>
.qr {
  display: flex;
  align-items: center;
  gap: calc(var(--u) * 2.4);
  padding: calc(var(--u) * 1.8);
  border-radius: calc(var(--u) * 1.4);
  background: rgb(30 41 59 / 0.7);
  color: #f8fafc;
}

.qr__code {
  flex-shrink: 0;
  width: calc(var(--u) * 22);
  height: calc(var(--u) * 22);
  border-radius: calc(var(--u) * 0.8);
  overflow: hidden;
  background: white;
}

.qr__code :deep(svg) {
  display: block;
  width: 100%;
  height: 100%;
  shape-rendering: crispEdges;
}

.qr__caption {
  font-size: calc(var(--u) * 2.6);
  line-height: 1.3;
  font-weight: 600;
  text-wrap: balance;
}
</style>
