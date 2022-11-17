import { Telegraf } from "telegraf";
import bunyan from "bunyan";
import { faker } from "@faker-js/faker";
import { DataBase } from "../db";
import puppeteer from "puppeteer";

export default function displayModule(
  bot: Telegraf,
  logger: bunyan,
  db: DataBase
) {
  bot.command("ranking", async (ctx) => {
    ctx.replyWithHTML(
      (await db.prisma.degree.findMany())
        .sort((a, b) => (a.points < b.points ? 1 : -1))
        .reduce(
          (prev, curr, index) =>
            prev +
            `${index === 3 ? "\n" : ""}${
              index === 0
                ? "\u{1F947}"
                : index === 1
                ? "\u{1F948}"
                : index === 2
                ? "\u{1F949}"
                : "\u{1F19A}"
            } ${curr.name} <code>${curr.points}</code>\n`,
          "<b>\u{1F3C6} RANKING \u{1F3C6}</b>\n\n"
        )
    );
  });

  bot.command("chart", async (ctx) => {
    const degrees = (await db.prisma.degree.findMany()).sort((a, b) =>
      a.points < b.points ? 1 : -1
    );

    const url = `https://quickchart.io/chart?bkg=transparent&f=png&width=1000&height=600&c={type:'bar',data:{labels:[${degrees.map(
      (degree) => "'" + degree.name + "'"
    )}],datasets:[{label:'Puntos',data:[${degrees.map(
      (degree) => degree.points
    )}]}]}}`;

    const barRawData = degrees.map(({ name, points }) => ({
      name,
      points,
      color: faker.color.rgb(),
      icon: faker.internet.emoji(),
    }));

    const minAxisValue = 35;
    const minAxis = () =>
      Math.floor(Math.max(...barRawData.map((d) => d.points))) >
      minAxisValue * 2
        ? Math.floor(Math.min(...barRawData.map((d) => d.points))) -
          minAxisValue
        : 0;

    const genBarLabels = () =>
      barRawData.sort((a, b) => b.points - a.points).map((d) => d.name);

    const barLabels = genBarLabels();

    const genBarDataset = () => ({
      data: barRawData.map((d) => d.points).sort((a, b) => b - a),
      borderColor: barRawData
        .sort((a, b) => b.points - a.points)
        .map((d) => d.color),
      backgroundColor: barRawData
        .sort((a, b) => b.points - a.points)
        .map((d) => d.color),
    });

    const barData = {
      labels: barLabels,
      datasets: [genBarDataset()],
    };

    const config = {
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
      plugins: ["ChartDataLabels"],
    };
    logger.info(
      {
        url: `https://quickchart.io/chart?f=png&width=1000&height=600&c=${JSON.stringify(
          config
        )}`,
      },
      "Generated graph"
    );

    ctx.replyWithDocument("https://defc.wupp.dev/ranking");
    // ctx.replyWithDocument(
    //   `https://quickchart.io/chart?f=png&width=1000&height=600&c=${JSON.stringify(
    //     config
    //   )}`
    // );
  });
}
