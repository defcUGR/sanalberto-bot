<script setup lang="ts">
import confetti from "canvas-confetti";
import {
  computed,
  onBeforeUnmount,
  ref,
  shallowRef,
  useTemplateRef,
  watch,
} from "vue";

import { degreeColor, degreeIcon } from "@/degrees";
import { sortRanking } from "@/ranking";
import {
  dataSeq,
  degrees,
  revealRequest,
  scoreboard,
  type DegreeRow,
  type RevealRequest,
} from "@/socket";

/*
 * Results ceremony, started by the server's `reveal` event (sent right before
 * the fresh `state`, `data`, `dataobject` and `movements`). It shows the title,
 * then 3rd, 2nd and 1st place, using the rows that arrive after `reveal`.
 * The overlay is opaque so the dashboard behind it cannot spoil the result.
 */

const TIMINGS = {
  normal: { title: 4000, place: 4500, first: 8000, outro: 900 },
  reduced: { title: 2000, place: 2500, first: 4000, outro: 0 },
};
/** Longest wait for the post-reveal `data` before using what we have. */
const DATA_TIMEOUT_MS = 2500;

const PLACES = [
  { medal: "🥇", label: "¡Primer puesto!", glow: "#f59e0b" },
  { medal: "🥈", label: "Segundo puesto", glow: "#9ca3af" },
  { medal: "🥉", label: "Tercer puesto", glow: "#b45309" },
] as const;

type Phase = "idle" | "title" | "place";

const phase = ref<Phase>("idle");
const leaving = ref(false);
const results = shallowRef<DegreeRow[]>([]);
/** Index into `results` (0 = 1st) of the place being shown. */
const current = ref(-1);
const reducedMotion = ref(false);

const year = computed(() => scoreboard.value?.year ?? new Date().getFullYear());

const shown = computed(() => {
  const row = results.value[current.value];
  const place = PLACES[current.value];
  if (!row || !place) return null;
  return {
    ...place,
    name: row.name,
    points: Math.floor(row.points),
    icon: degreeIcon(row.name),
    color: degreeColor(row.name),
  };
});

/** Places already revealed (lower ones), shown small at the bottom. */
const revealed = computed(() =>
  results.value
    .map((row, i) => ({ row, i, place: PLACES[i] }))
    .filter(({ i }) => phase.value === "place" && i > current.value)
    .reverse()
    .map(({ row, i, place }) => ({
      key: i,
      medal: place?.medal ?? "",
      name: row.name,
      icon: degreeIcon(row.name),
    })),
);

/* ------------------------------------------------------------------------ */
/* Sequence runner (cancellable)                                            */
/* ------------------------------------------------------------------------ */

let run = 0;
const timers = new Set<ReturnType<typeof setTimeout>>();
const stops = new Set<() => void>();

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    const t = setTimeout(() => {
      timers.delete(t);
      resolve();
    }, ms);
    timers.add(t);
  });

/** Resolves when `data` newer than `afterSeq` has arrived (or on timeout). */
const waitForData = (afterSeq: number) =>
  new Promise<void>((resolve) => {
    if (dataSeq.value > afterSeq) return resolve();
    const done = () => {
      stop();
      stops.delete(done);
      resolve();
    };
    const stop = watch(dataSeq, (seq) => seq > afterSeq && done());
    stops.add(done);
    wait(DATA_TIMEOUT_MS).then(done);
  });

const canvas = useTemplateRef<HTMLCanvasElement>("confettiCanvas");
let shoot: confetti.CreateTypes | undefined;

const fireConfetti = (myRun: number) => {
  if (!canvas.value || reducedMotion.value) return;
  shoot ??= confetti.create(canvas.value, {
    resize: true,
    disableForReducedMotion: true,
  });
  const colors = ["#f59e0b", "#fde68a", "#f8fafc", "#38bdf8", "#f472b6"];
  const burst = (x: number, angle: number) =>
    shoot?.({
      particleCount: 90,
      spread: 75,
      startVelocity: 55,
      angle,
      origin: { x, y: 0.75 },
      colors,
    });
  // A few waves over ~3 s.
  [0, 700, 1400, 2200, 3000].forEach((delay, k) =>
    wait(delay).then(() => {
      if (myRun !== run) return;
      burst(k % 2 ? 0.85 : 0.15, k % 2 ? 120 : 60);
      if (k === 2) {
        shoot?.({
          particleCount: 160,
          spread: 160,
          startVelocity: 45,
          origin: { x: 0.5, y: 0.45 },
          colors,
        });
      }
    }),
  );
};

const cleanup = () => {
  run++;
  timers.forEach(clearTimeout);
  timers.clear();
  stops.forEach((stop) => stop());
  stops.clear();
  // The canvas belongs to the overlay, which is recreated for every reveal.
  shoot?.reset();
  shoot = undefined;
};

const close = () => {
  cleanup();
  leaving.value = false;
  phase.value = "idle";
  current.value = -1;
  results.value = [];
};

const start = async (request: RevealRequest) => {
  cleanup();
  const myRun = run;
  const stale = () => myRun !== run;

  reducedMotion.value =
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  const t = reducedMotion.value ? TIMINGS.reduced : TIMINGS.normal;

  leaving.value = false;
  results.value = [];
  current.value = -1;
  phase.value = "title";

  await Promise.all([wait(t.title), waitForData(request.afterSeq)]);
  if (stale()) return;

  // Snapshot: later updates must not change what the ceremony shows.
  results.value = sortRanking(degrees.value).slice(0, 3);
  phase.value = "place";

  for (let i = results.value.length - 1; i >= 0; i--) {
    current.value = i;
    if (i === 0) fireConfetti(myRun);
    await wait(i === 0 ? t.first : t.place);
    if (stale()) return;
  }

  leaving.value = true;
  await wait(t.outro);
  if (stale()) return;
  close();
};

watch(revealRequest, (request) => {
  if (request) start(request);
});

/* ------------------------------------------------------------------------ */
/* Skipping                                                                 */
/* ------------------------------------------------------------------------ */

const onKey = (event: KeyboardEvent) => {
  if (event.key === "Escape" && phase.value !== "idle") close();
};
window.addEventListener("keydown", onKey);

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKey);
  cleanup();
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="phase !== 'idle'"
      class="reveal"
      :class="{ 'reveal--leaving': leaving, 'reveal--reduced': reducedMotion }"
      role="dialog"
      aria-modal="true"
      aria-label="Revelación de resultados"
      @click="close"
    >
      <div
        class="reveal__glow"
        :style="{ '--glow': shown?.glow ?? '#38bdf8' }"
        aria-hidden="true"
      />
      <canvas ref="confettiCanvas" class="reveal__confetti" />

      <!-- Keyed + CSS animation (not <Transition>): each step shows at once,
           without waiting for the previous one to finish leaving. -->
      <div
        v-if="phase === 'title'"
        key="title"
        class="reveal__title reveal__step"
      >
        <p class="reveal__kicker">Carrera de Carreras</p>
        <h1>¡Resultados San Alberto {{ year }}!</h1>
      </div>

      <div
        v-else-if="shown"
        :key="current"
        class="reveal__place reveal__step"
        aria-live="polite"
      >
        <p class="reveal__label">{{ shown.label }}</p>
        <p class="reveal__medal" aria-hidden="true">{{ shown.medal }}</p>
        <p class="reveal__name">
          <img v-if="shown.icon" :src="shown.icon" alt="" />{{ shown.name }}
        </p>
        <p class="reveal__points" :style="{ color: shown.color }">
          {{ shown.points }} puntos
        </p>
      </div>

      <ol v-if="revealed.length" class="reveal__revealed">
        <li v-for="r in revealed" :key="r.key">
          <span aria-hidden="true">{{ r.medal }}</span>
          <img v-if="r.icon" :src="r.icon" alt="" />
          {{ r.name }}
        </li>
      </ol>

      <p class="reveal__hint">Pulsa Esc o haz clic para saltar</p>
    </div>
  </Teleport>
</template>

<style scoped>
/* Opaque from the first frame: the dashboard behind already has the results. */
.reveal {
  --u: max(min(1vh, 0.5625vw), 4px);
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: #020617;
  color: #f8fafc;
  cursor: pointer;
  user-select: none;
  transition: opacity 0.9s ease;
}

.reveal--leaving {
  opacity: 0;
}

.reveal__glow {
  position: absolute;
  inset: -20%;
  background: radial-gradient(
    circle at 50% 45%,
    color-mix(in oklab, var(--glow) 35%, transparent),
    transparent 55%
  );
  transition: background 1s ease;
  animation: glow-pulse 4s ease-in-out infinite;
}

.reveal__confetti {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 2;
}

.reveal__title,
.reveal__place {
  position: relative;
  z-index: 1;
  text-align: center;
  padding: 0 calc(var(--u) * 4);
}

.reveal__kicker {
  font-size: calc(var(--u) * 3.5);
  color: #94a3b8;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  margin-bottom: calc(var(--u) * 2);
}

.reveal__title h1 {
  font-size: calc(var(--u) * 10);
  font-weight: 800;
  line-height: 1.05;
  text-wrap: balance;
  background: linear-gradient(90deg, #fde68a, #f59e0b, #fde68a);
  background-clip: text;
  color: transparent;
}

.reveal__label {
  font-size: calc(var(--u) * 4.5);
  font-weight: 700;
  color: #cbd5e1;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.reveal__medal {
  font-size: calc(var(--u) * 20);
  line-height: 1.15;
}

.reveal__name {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: calc(var(--u) * 2.5);
  font-size: calc(var(--u) * 10);
  font-weight: 800;
  line-height: 1.1;
}

.reveal__name img {
  height: calc(var(--u) * 11);
}

.reveal__points {
  margin-top: calc(var(--u) * 2);
  font-size: calc(var(--u) * 6);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.reveal__revealed {
  position: absolute;
  bottom: calc(var(--u) * 8);
  z-index: 1;
  display: flex;
  gap: calc(var(--u) * 4);
  font-size: calc(var(--u) * 3);
  color: #cbd5e1;
}

.reveal__revealed li {
  display: flex;
  align-items: center;
  gap: calc(var(--u) * 1);
}

.reveal__revealed img {
  height: calc(var(--u) * 3.2);
}

.reveal__hint {
  position: absolute;
  bottom: calc(var(--u) * 2.5);
  right: calc(var(--u) * 3);
  z-index: 1;
  font-size: calc(var(--u) * 1.8);
  color: #64748b;
}

.reveal__step {
  animation: step-in 0.8s cubic-bezier(0.2, 1.4, 0.4, 1) both;
}

@keyframes step-in {
  from {
    opacity: 0;
    transform: scale(0.6);
  }
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
}

@keyframes glow-pulse {
  50% {
    opacity: 0.6;
  }
}

/* Reduced motion: plain fades, no scaling or pulsing (and no confetti). */
.reveal--reduced .reveal__glow {
  animation: none;
}
.reveal--reduced {
  transition: none;
}
.reveal--reduced .reveal__step {
  animation: fade-in 0.3s linear both;
}
</style>
