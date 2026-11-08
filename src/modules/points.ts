import { Markup } from "telegraf";
import type { BotModule } from "../bot";
import type { PointsType } from "../db";
import { escapeHtml, formatNumber, requireAdmin, who } from "../telegram";

// /add and /remove: pick the base points, then the degree. The degree's
// weight multiplies them. Button data stays short (Telegram allows 64 bytes):
//   pts:<type>:<points>   deg:<type>:<points>:<degree id>   cancel:<type>

const POINTS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];

function pairs<T>(items: T[]): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
  return rows;
}

const VERB: Record<PointsType, { title: string; done: string; sign: string }> = {
  add: { title: "añadir", done: "añadidos", sign: "+" },
  remove: { title: "quitar", done: "quitados", sign: "-" },
};

const pointsModule: BotModule = (bot, deps) => {
  const { db, live } = deps;

  async function askPoints(type: PointsType, reply: (text: string, extra: object) => Promise<unknown>) {
    await reply(
      `Selecciona la cantidad de puntos a ${VERB[type].title}`,
      Markup.inlineKeyboard([
        ...pairs(POINTS.map((p) => Markup.button.callback(String(p), `pts:${type}:${p}`))),
        [Markup.button.callback("Cancelar", `cancel:${type}`)],
      ])
    );
  }

  bot.command("add", async (ctx) => {
    if (await requireAdmin(ctx, deps)) await askPoints("add", (t, e) => ctx.reply(t, e));
  });

  bot.command("remove", async (ctx) => {
    if (await requireAdmin(ctx, deps)) await askPoints("remove", (t, e) => ctx.reply(t, e));
  });

  bot.action(/^pts:(add|remove):(\d+)$/, async (ctx) => {
    if (!(await requireAdmin(ctx, deps))) return;
    const type = ctx.match[1] as PointsType;
    const points = Number(ctx.match[2]);
    const degrees = [...(await db.degrees())].sort((a, b) => a.name.localeCompare(b.name));
    await ctx.editMessageText(
      `Selecciona la carrera a la que quieres ${VERB[type].title} ${points} puntos`,
      Markup.inlineKeyboard([
        ...pairs(degrees.map((d) => Markup.button.callback(d.name, `deg:${type}:${points}:${d.id}`))),
        [Markup.button.callback("Cancelar", `cancel:${type}`)],
      ])
    );
    await ctx.answerCbQuery();
  });

  bot.action(/^deg:(add|remove):(\d+):(\d+)$/, async (ctx) => {
    if (!(await requireAdmin(ctx, deps))) return;
    const type = ctx.match[1] as PointsType;
    const base = Number(ctx.match[2]);
    const degreeId = Number(ctx.match[3]);
    // Remove the keyboard first, so a double tap cannot apply it twice.
    await ctx.deleteMessage().catch(() => undefined);
    const degree = await db.prisma.degree.findUnique({ where: { id: degreeId } });
    if (!degree) {
      await ctx.answerCbQuery("Esa carrera ya no existe", { show_alert: true });
      return;
    }
    const result = await db.applyPoints(degreeId, base, type, who(ctx));
    await live.refresh();
    if (result.applied === 0) {
      await ctx.replyWithHTML(`<b>${escapeHtml(result.degree.name)}</b> ya estaba a 0: no se ha quitado nada.`);
      await ctx.answerCbQuery();
      return;
    }
    const floor =
      result.applied !== result.weighted ? ` (se queda en 0: solo se quitaron ${result.applied})` : "";
    await ctx.replyWithHTML(
      `¡Puntos ${VERB[type].done}! <b>${escapeHtml(result.degree.name)}</b> tiene ahora <b>${result.degree.points}</b> ` +
        `(${VERB[type].sign}${result.weighted} = ${base} × ${formatNumber(degree.weight)})${floor}`
    );
    await ctx.answerCbQuery();
  });

  bot.action(/^cancel:(add|remove)$/, async (ctx) => {
    await ctx.deleteMessage().catch(() => undefined);
    await ctx.reply(`¡Los puntos no han sido ${VERB[ctx.match[1] as PointsType].done}!`);
    await ctx.answerCbQuery();
  });
};

export default pointsModule;
