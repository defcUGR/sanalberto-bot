<template>
  <section
    class="flex items-end justify-center w-screen gap-2 lg:gap-3 py-36 -ml-4"
  >
    <div class="bg-gray-400 h-36 w-28 md:w-32 lg:w-48 relative">
      <p class="absolute top-0 w-full text-center mt-1 text-5xl">🥈</p>
      <p
        class="absolute -top-16 text-slate-50 text-xl lg:text-2xl font-semibold w-full text-center"
      >
      <!--@ts-gnore -->
        <img :src="icons[top[1].name]" class="inline h-6 mr-2 mb-1.5" />
        {{ top[1].name }}
      </p>
    </div>
    <div class="bg-amber-500 h-48 w-28 md:w-32 lg:w-48 relative">
      <p class="absolute top-0 w-full text-center mt-1 text-5xl">🥇</p>
      <p
        class="absolute -top-16 text-slate-50 text-xl lg:text-2xl font-semibold w-full text-center"
      >
        <img :src="icons[top[0].name]" class="inline h-6 mr-2 mb-1.5" />{{
          top[0].name
        }}
      </p>
    </div>
    <div class="bg-yellow-800 h-24 w-28 md:w-32 lg:w-48 relative">
      <p class="absolute top-0 w-full text-center mt-1 text-5xl">🥉</p>
      <p
        class="absolute -top-16 text-slate-50 text-xl lg:text-2xl font-semibold w-full text-center"
      >
        <img :src="icons[top[2].name]" class="inline h-6 mr-2 mb-1.5" />{{
          top[2].name
        }}
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import biologiaEmoji from "../assets/emojis/biologia.svg";
import bioquimicaEmoji from "../assets/emojis/bioquimi.svg";
import biotecEmoji from "../assets/emojis/biotec.svg";
import matesEmoji from "../assets/emojis/mates.svg";
import estadisticaEmoji from "../assets/emojis/estadisticabien.png.svg";
import ambientalesEmoji from "../assets/emojis/ccambientales.svg";
import fisicaEmoji from "../assets/emojis/fisica.svg";
import geologiaEmoji from "../assets/emojis/geologia.svg";
import ingElectroEmoji from "../assets/emojis/ingelectro.svg";
import ingQuimicaEmoji from "../assets/emojis/ingquimica.svg";
import opticaEmoji from "../assets/emojis/optica.svg";
import quimicaEmoji from "../assets/emojis/quimica.svg";

import { socket } from "@/socket";
import { ref } from "vue";

const icons = {
  Matemáticas: matesEmoji,
  Física: fisicaEmoji,
  Biología: biologiaEmoji,
  Bioquímica: bioquimicaEmoji,
  Biotecnología: biotecEmoji,
  Estadística: estadisticaEmoji,
  "CC. Ambientales": ambientalesEmoji,
  Geología: geologiaEmoji,
  "Ing. Electrónica": ingElectroEmoji,
  "Ing. Química": ingQuimicaEmoji,
  Óptica: opticaEmoji,
  Química: quimicaEmoji,
  "Loading...": "",
};

const top = ref([
  {
    name: "Loading...",
  },
  {
    name: "Loading...",
  },
  {
    name: "Loading...",
  },
]);

socket.on("data", (data: any[]) => {
  top.value = data.sort((a, b) => b.points - a.points);
  console.log(top);
});
</script>
