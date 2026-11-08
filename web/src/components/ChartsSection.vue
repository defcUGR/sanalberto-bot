<script setup lang="ts">
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
  type ChartConfiguration,
  type ChartDataset,
} from "chart.js";
import { toFont } from "chart.js/helpers";
import ChartDataLabels from "chartjs-plugin-datalabels";
import type { Context as DatalabelsContext } from "chartjs-plugin-datalabels";
import { onBeforeUnmount, onMounted, useTemplateRef, watch } from "vue";

import { DEGREES, degreeColor } from "@/degrees";
import { points, type PointsByDegree } from "@/socket";

Chart.register(
  BarController,
  BarElement,
  CategoryScale,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
);

const lineCanvas = useTemplateRef<HTMLCanvasElement>("lineCanvas");
const barCanvas = useTemplateRef<HTMLCanvasElement>("barCanvas");

/** Degree names in legend order: known degrees first, then any new ones. */
const degreeNames = (values: PointsByDegree) => {
  const known = DEGREES.map((d) => d.name);
  const extra = Object.keys(values).filter((n) => !known.includes(n));
  return [...known.filter((n) => n in values), ...extra];
};

/* ------------------------------------------------------------------------ */
/* Timeline                                                                 */
/* ------------------------------------------------------------------------ */

/*
 * The server only emits on connect and when points change, so the timeline
 * keeps timestamped snapshots and draws each degree as a stepped line on a
 * time axis (linear, epoch ms). A trailing point at "now", refreshed every
 * few seconds, keeps the lines reaching the right edge while nothing changes.
 */
interface Snapshot {
  t: number;
  values: PointsByDegree;
}

type TimelinePoint = { x: number; y: number };

/** Visible time span of the timeline. */
const WINDOW_MS = 30 * 60 * 1000;
/** Hard cap on stored snapshots. */
const MAX_SNAPSHOTS = 200;
/** How often the "now" end of the timeline moves forward. */
const TICK_MS = 2000;

const history: Snapshot[] = [];

const sameValues = (a: PointsByDegree, b: PointsByDegree) => {
  const keys = Object.keys(a);
  return (
    keys.length === Object.keys(b).length && keys.every((k) => a[k] === b[k])
  );
};

const pushSnapshot = (values: PointsByDegree, now: number) => {
  const last = history.at(-1);
  // A reconnect re-sends the same values: nothing changed, nothing to add.
  if (last && sameValues(last.values, values)) return;
  history.push({ t: now, values: { ...values } });
};

/** Drops snapshots outside the window, keeping the one in effect at its start. */
const pruneHistory = (now: number) => {
  const start = now - WINDOW_MS;
  let firstVisible = history.findIndex((s) => s.t >= start);
  if (firstVisible === -1) firstVisible = history.length;
  const drop = Math.max(firstVisible - 1, history.length - MAX_SNAPSHOTS, 0);
  if (drop > 0) history.splice(0, drop);
  const first = history[0];
  if (first && first.t < start) first.t = start;
};

const lineConfig: ChartConfiguration<"line", TimelinePoint[]> = {
  type: "line",
  data: { datasets: [] },
  options: {
    animation: false,
    parsing: false,
    // Taller on narrow screens, where the legend alone fills a 2:1 chart.
    aspectRatio: window.innerWidth < 640 ? 1 : 2,
    onResize: (chart, { width }) => {
      const ratio = width < 640 ? 1 : 2;
      if (chart.options.aspectRatio !== ratio) {
        chart.options.aspectRatio = ratio;
        chart.resize();
      }
    },
    interaction: { mode: "nearest", axis: "x", intersect: false },
    elements: {
      point: { radius: 0, hoverRadius: 3 },
      line: { stepped: "after" },
    },
    plugins: {
      legend: { position: "top" },
      tooltip: {
        callbacks: {
          title: (items) =>
            items[0]
              ? new Date(items[0].parsed.x ?? 0).toLocaleTimeString("es-ES")
              : "",
        },
      },
      datalabels: {
        formatter: (value: TimelinePoint, context) =>
          context.dataIndex === context.dataset.data.length - 1
            ? Math.floor(value.y)
            : "",
        anchor: "end",
        align: 200,
      },
    },
    scales: {
      x: {
        type: "linear",
        // Use the exact first/last timestamps (no rounding to "nice" ticks).
        bounds: "data",
        display: false,
        grid: { display: false },
      },
      y: {
        border: { display: false },
      },
    },
  },
  plugins: [ChartDataLabels],
};

const lineDatasets = new Map<string, ChartDataset<"line", TimelinePoint[]>>();

const renderTimeline = (chart: Chart<"line", TimelinePoint[]>) => {
  const last = history.at(-1);
  if (!last) return;
  const now = Date.now();
  pruneHistory(now);

  const names = degreeNames(last.values);
  chart.data.datasets = names.map((name) => {
    let dataset = lineDatasets.get(name);
    if (!dataset) {
      const color = degreeColor(name);
      dataset = {
        label: name,
        data: [],
        backgroundColor: color,
        borderColor: color,
      };
      lineDatasets.set(name, dataset);
    }
    const data = history
      .filter((s) => name in s.values)
      .map((s): TimelinePoint => ({ x: s.t, y: s.values[name] ?? 0 }));
    data.push({ x: Math.max(now, last.t), y: last.values[name] ?? 0 });
    dataset.data = data;
    return dataset;
  });
  chart.update("none");
};

/* ------------------------------------------------------------------------ */
/* Ranking                                                                  */
/* ------------------------------------------------------------------------ */

const MIN_AXIS_MARGIN = 35;
const BAR_LABEL_FONT = { weight: 600, size: 25 } as const;

const barLabel = (context: DatalabelsContext) => {
  const value = Number(context.dataset.data[context.dataIndex] ?? 0);
  const name = context.chart.data.labels?.[context.dataIndex] ?? "";
  return ` ${name} ${Math.floor(value)}   `;
};

const barLabelFits = (context: DatalabelsContext) => {
  const { chart } = context;
  const x = chart.scales.x;
  if (!x) return true;
  const value = Number(context.dataset.data[context.dataIndex] ?? 0);
  const barWidth = x.getPixelForValue(value) - x.left;
  chart.ctx.save();
  chart.ctx.font = toFont(BAR_LABEL_FONT).string;
  const textWidth = chart.ctx.measureText(barLabel(context)).width;
  chart.ctx.restore();
  return textWidth <= barWidth;
};

const barConfig: ChartConfiguration<"bar", number[], string> = {
  type: "bar",
  data: { labels: [], datasets: [{ data: [] }] },
  options: {
    indexAxis: "y",
    animation: false,
    scales: {
      y: { display: false },
      x: { position: "top", min: 0 },
    },
    plugins: {
      tooltip: { enabled: false },
      legend: { display: false },
      datalabels: {
        // Inside the bar when it fits, otherwise just past its end.
        color: (context) => (barLabelFits(context) ? "#0f172a" : "#e2e8f0"),
        font: BAR_LABEL_FONT,
        formatter: (_value: number, context) => barLabel(context),
        align: (context) => (barLabelFits(context) ? "start" : "end"),
        anchor: "end",
      },
    },
  },
  plugins: [ChartDataLabels],
};

const renderRanking = (
  chart: Chart<"bar", number[], string>,
  values: PointsByDegree,
) => {
  const ranking = degreeNames(values)
    .map((name) => ({ name, points: values[name] ?? 0 }))
    .sort((a, b) => b.points - a.points);
  const scores = ranking.map((r) => r.points);
  const colors = ranking.map((r) => degreeColor(r.name));

  chart.data.labels = ranking.map((r) => r.name);
  chart.data.datasets = [
    { data: scores, backgroundColor: colors, borderColor: colors },
  ];
  // Start the axis just below the last degree once scores grow, so the
  // differences stay visible.
  const highest = scores.length ? Math.floor(Math.max(...scores)) : 0;
  const lowest = scores.length ? Math.floor(Math.min(...scores)) : 0;
  const x = chart.options.scales?.x;
  if (x) x.min = highest > MIN_AXIS_MARGIN * 2 ? lowest - MIN_AXIS_MARGIN : 0;
  chart.update("none");
};

/* ------------------------------------------------------------------------ */

let lineChart: Chart<"line", TimelinePoint[]> | undefined;
let barChart: Chart<"bar", number[], string> | undefined;
let tick: ReturnType<typeof setInterval> | undefined;

onMounted(() => {
  if (!lineCanvas.value || !barCanvas.value) return;
  lineChart = new Chart(lineCanvas.value, lineConfig);
  barChart = new Chart(barCanvas.value, barConfig);

  watch(
    points,
    (values) => {
      if (!values || !lineChart || !barChart) return;
      pushSnapshot(values, Date.now());
      renderTimeline(lineChart);
      renderRanking(barChart, values);
    },
    { immediate: true },
  );

  tick = setInterval(() => {
    if (lineChart) renderTimeline(lineChart);
  }, TICK_MS);
});

onBeforeUnmount(() => {
  clearInterval(tick);
  lineChart?.destroy();
  barChart?.destroy();
});
</script>

<template>
  <section>
    <canvas ref="lineCanvas"></canvas>
    <canvas ref="barCanvas" height="600"></canvas>
  </section>
</template>
