import type { BotModule } from "../bot";
import { renderRanking } from "../chart";
import { config } from "../config";
import { escapeHtml } from "../telegram";

const MEDALS = ["\u{1F947}", "\u{1F948}", "\u{1F949}"];

const displayModule: BotModule = (bot, { db, logger }) => {
  bot.command("ranking", async (ctx) => {
    const degrees = await db.degrees();
    const lines = degrees.map(
      (d, i) => `${i === 3 ? "\n" : ""}${MEDALS[i] ?? "\u{1F19A}"} ${escapeHtml(d.name)} <code>${d.points}</code>`
    );
    await ctx.replyWithHTML(`<b>\u{1F3C6} RANKING \u{1F3C6}</b>\n\n${lines.join("\n")}`);
  });

  bot.command("chart", async (ctx) => {
    await ctx.sendChatAction("upload_photo");
    const png = await renderRanking(await db.degrees(), logger);
    await ctx.replyWithPhoto(
      { source: png, filename: "ranking.png" },
      { caption: `Carrera de Carreras · San Alberto ${config.editionYear}` }
    );
  });
};

export default displayModule;
