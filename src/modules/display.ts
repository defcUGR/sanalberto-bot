import type { BotModule } from "../bot";
import { renderRanking } from "../chart";
import { standingsText } from "./editions";

// /ranking and /chart. While the scoreboard is frozen the public sees the
// frozen points and admins the real ones, with a note.

const displayModule: BotModule = (bot, { db, logger }) => {
  async function view(from: Parameters<typeof db.findAdmin>[0] | undefined) {
    const edition = await db.currentEdition();
    const frozen = !!edition.frozen_at;
    const isAdmin = frozen && !!from && !!(await db.findAdmin(from));
    const degrees = frozen && !isAdmin ? await db.publicDegrees(edition) : await db.degrees();
    const standings = [...degrees]
      .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name))
      .map((d, i) => ({ position: i + 1, degree: d.name, points: d.points }));
    const note = !frozen ? "" : isAdmin ? "real (público congelado)" : "marcador congelado";
    return { edition, standings, note };
  }

  bot.command("ranking", async (ctx) => {
    const { edition, standings, note } = await view(ctx.from);
    await ctx.replyWithHTML(
      `<b>\u{1F3C6} RANKING ${edition.year} \u{1F3C6}</b>${note ? `\n<i>❄️ ${note}</i>` : ""}\n\n${standingsText(standings)}`
    );
  });

  bot.command("chart", async (ctx) => {
    await ctx.sendChatAction("upload_photo");
    const { edition, standings, note } = await view(ctx.from);
    const png = await renderRanking(
      standings.map((s) => ({ name: s.degree, points: s.points })),
      edition.year,
      logger,
      note || undefined
    );
    await ctx.replyWithPhoto(
      { source: png, filename: "ranking.png" },
      { caption: `Carrera de Carreras · San Alberto ${edition.year}${note ? ` · ${note}` : ""}` }
    );
  });
};

export default displayModule;
