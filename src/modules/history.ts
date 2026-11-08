import type { BotModule } from "../bot";
import { commandArgs, escapeHtml, requireAdmin, who } from "../telegram";

// Points history (every /add and /remove is recorded) and undo.

const TIME = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: process.env.TZ || "Europe/Madrid",
});

const historyModule: BotModule = (bot, deps) => {
  const { db, live } = deps;

  bot.command("historial", async (ctx) => {
    if (!(await requireAdmin(ctx, deps))) return;
    const count = Math.min(50, Math.max(1, Number(commandArgs(ctx)) || 10));
    const events = await db.lastEvents(count);
    if (!events.length) {
      await ctx.reply("Todavía no hay cambios de puntos.");
      return;
    }
    await ctx.replyWithHTML(
      (events.length === 1 ? "<b>ÚLTIMO CAMBIO</b>\n\n" : `<b>ÚLTIMOS ${events.length} CAMBIOS</b>\n\n`) +
        events
          .map(
            (e) =>
              `${TIME.format(e.timestamp)} · ${e.type === 1 ? "+" : "-"}${e.points} ${escapeHtml(e.Degree.name)} · @${escapeHtml(e.username)}`
          )
          .join("\n")
    );
  });

  bot.command("deshacer", async (ctx) => {
    if (!(await requireAdmin(ctx, deps))) return;
    const undone = await db.undoLast(who(ctx));
    if (!undone) {
      await ctx.reply("No tienes cambios de puntos que deshacer.");
      return;
    }
    await live.refresh();
    await ctx.replyWithHTML(
      `Deshecho: ${undone.type === "add" ? "+" : "-"}${undone.points} a <b>${escapeHtml(undone.degree.name)}</b>, que tiene ahora <b>${undone.degree.points}</b>.`
    );
  });
};

export default historyModule;
