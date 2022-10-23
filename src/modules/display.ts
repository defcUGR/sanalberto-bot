import { Telegraf } from "telegraf";
import bunyan from "bunyan";
import { PrismaClient } from "@prisma/client";

export default function displayModule(
  bot: Telegraf,
  logger: bunyan,
  prisma: PrismaClient
) {
  bot.command("ranking", async (ctx) => {
    let html = "";
    (await prisma.degree.findMany())
      .sort((a, b) => (a.points < b.points ? 1 : -1))
      .forEach((degree, index) => {
        html = html.concat(
          `${
            index === 0
              ? "\u{1F947}"
              : index === 1
              ? "\u{1F948}"
              : index === 2
              ? "\u{1F949}"
              : "\u{1F19A}"
          } ${degree.name} <code>${degree.points}</code>\n`
        );
      });
    ctx.replyWithHTML("<b>\u{1F3C6} RANKING \u{1F3C6}</b>\n\n".concat(html));
  });

  bot.command("chart", async (ctx) => {
    const degrees = (await prisma.degree.findMany()).sort((a, b) =>
      a.points < b.points ? 1 : -1
    );
    const url = `https://quickchart.io/chart?bkg=transparent&f=png&width=1000&height=600&c={type:'bar',data:{labels:[${degrees.map(
      (degree) => "'" + degree.name + "'"
    )}],datasets:[{label:'Puntos',data:[${degrees.map(
      (degree) => degree.points
    )}]}]}}`;
    logger.info(
      {
        url,
      },
      "Generated graph"
    );
    ctx.replyWithDocument(url);
  });
}
