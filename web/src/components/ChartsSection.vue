<template>
  <section id="charts">
    <canvas ref="lineCanvas"></canvas>
    <canvas ref="barCanvas" id="rankingCanvas"></canvas>
  </section>
</template>

<script setup lang="ts">
//@ts-nocheck
import { onMounted, ref } from "vue";

import type { ChartConfiguration, ChartData, ChartDataset } from "chart.js";
import { Chart, registerables } from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { socket } from "../socket";

const lineMaxData = 20;

const lineCanvas = ref(null);

const lineLabels = [""];

const lineData: ChartData = {
  labels: lineLabels,
  datasets: [
    {
      label: "Matemáticas",
      backgroundColor: "#f4b183",
      borderColor: "#f4b183",
      data: [0],
      pointRadius: 0,
    },
    {
      label: "Estadística",
      backgroundColor: "#ccffff",
      borderColor: "#ccffff",
      data: [0],
      pointRadius: 0,
    },
    {
      label: "Física",
      backgroundColor: "#ffe699",
      borderColor: "#ffe699",
      data: [0],
      pointRadius: 0,
    },
    {
      label: "Geología",
      backgroundColor: "#ffcccc",
      borderColor: "#ffcccc",
      data: [0],
      pointRadius: 0,
    },
    {
      label: "Química",
      backgroundColor: "#ffccff",
      borderColor: "#ffccff",
      data: [0],
      pointRadius: 0,
    },
    {
      label: "Óptica",
      backgroundColor: "#0099cc",
      borderColor: "#0099cc",
      data: [0],
      pointRadius: 0,
    },
    {
      label: "Biología",
      backgroundColor: "#c5e0b4",
      borderColor: "#c5e0b4",
      data: [0],
      pointRadius: 0,
    },
    {
      label: "Biotecnología",
      backgroundColor: "#dddddd",
      borderColor: "#dddddd",
      data: [0],
      pointRadius: 0,
    },
    {
      label: "Bioquímica",
      backgroundColor: "#9dc3e6",
      borderColor: "#9dc3e6",
      data: [0],
      pointRadius: 0,
    },
    {
      label: "Ing. Química",
      backgroundColor: "#9999ff",
      borderColor: "#9999ff",
      data: [0],
      pointRadius: 0,
    },
    {
      label: "Ing. Electrónica",
      backgroundColor: "#ccccff",
      borderColor: "#ccccff",
      data: [0],
      pointRadius: 0,
    },
    {
      label: "CC. Ambientales",
      backgroundColor: "#ccffcc",
      borderColor: "#ccffcc",
      data: [0],
      pointRadius: 0,
    },
  ],
};

const lineConfig: ChartConfiguration = {
  type: "line",
  data: lineData,
  options: {
    backgroundColor: "transparent",
    plugins: {
      legend: {
        position: "top",
      },
      datalabels: {
        formatter: function (value, context) {
          if (context.dataIndex === context.dataset.data.length - 1) {
            return Math.floor(value);
          }
          return "";
        },
        anchor: "end",
        align: 200,
      },
    },
    scales: {
      yAxes: {
        grid: {
          drawBorder: false,
        },
      },
      xAxes: {
        display: false,
        grid: {
          display: false,
        },
      },
    },
  },
  plugins: [ChartDataLabels],
};

const barCanvas = ref(null);

interface RawData {
  name:
    | "Matemáticas"
    | "Física"
    | "Química"
    | "Óptica"
    | "Ing. Electrónica"
    | "Ing. Química"
    | "Biología"
    | "Bioquímica"
    | "Biotecnología"
    | "CC. Ambientales"
    | "Geología"
    | "Estadística";
  points: number;
  color: string;
  icon: string;
}

const barRawData: RawData[] = [
  {
    name: "Matemáticas",
    points: 0,
    color: "#f4b183",
    icon: "\u{1F7F0}",
  },
  {
    name: "Física",
    points: 0,
    color: "#ffe699",
    icon: "\u{1FA90}",
  },
  {
    name: "Química",
    points: 0,
    color: "#ffccff",
    icon: "\u{2697}",
  },
  {
    name: "Óptica",
    points: 0,
    color: "#0099cc",
    icon: "\u{2697}",
  },
  {
    name: "Biología",
    points: 0,
    color: "#c5e0b4",
    icon: "\u{2697}",
  },
];

const genBarLabels = () =>
  barRawData.sort((a, b) => b.points - a.points).map((d) => d.name);

const barLabels = genBarLabels();

const genBarDataset = (): ChartDataset => ({
  data: barRawData.map((d) => d.points).sort((a, b) => b - a),
  borderColor: barRawData
    .sort((a, b) => b.points - a.points)
    .map((d) => d.color),
  backgroundColor: barRawData
    .sort((a, b) => b.points - a.points)
    .map((d) => d.color),
});

const barData: ChartData = {
  labels: barLabels,
  datasets: [genBarDataset()],
};

const minAxisValue = 35;
const minAxis = () =>
  Math.floor(Math.max(...barRawData.map((d) => d.points))) > minAxisValue * 2
    ? Math.floor(Math.min(...barRawData.map((d) => d.points))) - minAxisValue
    : 0;

const barConfig: ChartConfiguration = {
  type: "bar",
  data: barData,
  options: {
    backgroundColor: "transparent",
    indexAxis: "y" as const,
    scales: {
      yAxis: {
        display: false,
      },
      xAxis: {
        position: "top",
        min: minAxis(),
      },
    },
    plugins: {
      tooltip: {
        enabled: false,
      },
      legend: {
        display: false,
      },
      datalabels: {
        color: "white",
        font: {
          weight: 600,
          size: 25,
        },
        formatter: (value, context) =>
          barRawData[context.dataIndex].icon +
          " " +
          (context.chart.data.labels[context.dataIndex] || "undef") +
          " " +
          Math.floor(value) +
          "   ",
        align: "start",
        anchor: "end",
      },
    },
  },

  plugins: [ChartDataLabels],
};

Chart.register(...registerables);

onMounted(() => {
  //@ts-ignore
  const lineChart = new Chart(lineCanvas.value, lineConfig);
  //@ts-ignore
  const barChart = new Chart(barCanvas.value, barConfig);

  // TODO En vez de recibir el cambio, directamente recibir las puntuaciones actualizadas
  socket.on(
    "dataobject",
    (data: { Matemáticas: number; Física: number; Química: number }) => {
      // Receive a data object with the points to add to each
      console.info("Updating data...", data);
      // Update line chart
      if ((lineChart.data.labels?.length || 0) < lineMaxData)
        lineChart.data.labels?.push("");
      lineChart.data.datasets.forEach((dataset) => {
        // dataset.data.push(
        //   (dataset.data.at(-1) as number) + data[dataset.label]
        // );
        dataset.data.push(data[dataset.label]);
        if (dataset.data.length > lineMaxData) {
          dataset.data = dataset.data.slice(1);
        }
      });
      lineChart.update("none");
      console.log(
        "new data",
        lineChart.data.labels?.length,
        lineChart.data.datasets[0].data.length,
        lineChart.data.labels?.length ===
          lineChart.data.datasets[0].data.length,
        lineChart.data
      );
      // Update bar chart
      barRawData.forEach((el) => {
        console.info("bar actual for", el.name, ":", el.points);
        el.points = data[el.name];
        // el.points += data[el.name];
        console.info(
          "bar new points for",
          el.name,
          ":",
          el.points,
          "(+",
          data[el.name],
          ")"
        );
        barChart.data.datasets = [genBarDataset()];
        barChart.data.labels = genBarLabels();
        barChart.options.scales.xAxis.min = minAxis();
        barChart.update("none");
      });
      window.status = "ready";
    }
  );
  console.log("mounted things");
});
</script>
