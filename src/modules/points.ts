import { Markup, type Context } from "telegraf";
import type { BotModule } from "../bot";
import type { PointsType } from "../db";
import { degreeStyle } from "../degrees";
import {
  commandArgs,
  escapeHtml,
  findDegree,
  formatNumber,
  requireAdmin,
  who,
  type BotDeps,
} from "../telegram";

// /add and /remove. Any amount and degree can be given in the command
// (`/add 37 física`); whatever is missing is asked with buttons. The degree's
// weight multiplies the points. Button data stays short (Telegram allows 64
// bytes):  pts:<type>:<points>   deg:<type>:<points>:<degree id>   cancel:<type>

const POINTS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
const MAX_POINTS = 1000;

function pairs<T>(items: T[]): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
  return rows;
}

const VERB: Record<PointsType, { title: string; done: string; sign: string }> = {
  add: { title: "añadir", done: "añadidos", sign: "+" },
  remove: { title: "quitar", done: "quitados", sign: "-" },
};

async function degreeKeyboard({ db }: BotDeps, type: PointsType, points: number) {
  const degrees = [...(await db.degrees())].sort((a, b) => a.name.localeCompare(b.name));
  return Markup.inlineKeyboard([
    ...pairs(degrees.map((d) => Markup.button.callback(d.name, `deg:${type}:${points}:${d.id}`))),
    [Markup.button.callback("Cancelar", `cancel:${type}`)],
  ]);
}

/** Applies the points and replies with the result. */
async function apply(ctx: Context, deps: BotDeps, type: PointsType, base: number, degreeId: number) {
  const { db, live } = deps;
  const degree = await db.prisma.degree.findUnique({ where: { id: degreeId } });
  if (!degree) {
    await ctx.reply("Esa carrera ya no existe.");
    return;
  }
  const result = await db.applyPoints(degreeId, base, type, who(ctx));
  await live.refresh();
  if (result.applied === 0) {
    await ctx.replyWithHTML(`<b>${escapeHtml(result.degree.name)}</b> ya estaba a 0: no se ha quitado nada.`);
    return;
  }
  const floor =
    result.applied !== result.weighted ? ` (se queda en 0: solo se quitaron ${result.applied})` : "";
  const frozen = (await db.currentEdition()).frozen_at ? "\n❄️ El marcador público está congelado." : "";
  await ctx.replyWithHTML(
    `¡Puntos ${VERB[type].done}! <b>${escapeHtml(result.degree.name)}</b> tiene ahora <b>${result.degree.points}</b> ` +
      `(${VERB[type].sign}${result.weighted} = ${base} × ${formatNumber(degree.weight)})${floor}${frozen}`
  );
}

const pointsModule: BotModule = (bot, deps) => {
  const { db } = deps;

  async function command(ctx: Context, type: PointsType) {
    if (!(await requireAdmin(ctx, deps))) return;
    const [first, ...rest] = commandArgs(ctx).split(/\s+/).filter(Boolean);

    if (!first) {
      await ctx.reply(
        `Selecciona la cantidad de puntos a ${VERB[type].title} (o escribe /${type} <puntos> [carrera])`,
        Markup.inlineKeyboard([
          ...pairs(POINTS.map((p) => Markup.button.callback(String(p), `pts:${type}:${p}`))),
          [Markup.button.callback("Cancelar", `cancel:${type}`)],
        ])
      );
      return;
    }

    const points = Number(first);
    if (!Number.isInteger(points) || points < 1 || points > MAX_POINTS) {
      await ctx.replyWithHTML(
        `<b>ERROR</b> Los puntos tienen que ser un número entero entre 1 y ${MAX_POINTS}: <code>/${type} 37 Física</code>`
      );
      return;
    }

    if (!rest.length) {
      await ctx.reply(
        `Selecciona la carrera a la que quieres ${VERB[type].title} ${points} puntos`,
        await degreeKeyboard(deps, type, points)
      );
      return;
    }

    const found = findDegree(await db.degrees(), rest.join(" "), (name) => degreeStyle(name).aliases ?? []);
    if ("match" in found) {
      await apply(ctx, deps, type, points, found.match.id);
      return;
    }
    await ctx.replyWithHTML(
      (found.candidates.length
        ? `<b>¿Qué carrera?</b> «${escapeHtml(rest.join(" "))}» puede ser varias:`
        : `<b>No encuentro la carrera</b> «${escapeHtml(rest.join(" "))}». Elígela:`),
      await degreeKeyboard(deps, type, points)
    );
  }

  bot.command("add", (ctx) => command(ctx, "add"));
  bot.command("remove", (ctx) => command(ctx, "remove"));

  bot.action(/^pts:(add|remove):(\d+)$/, async (ctx) => {
    if (!(await requireAdmin(ctx, deps))) return;
    const type = ctx.match[1] as PointsType;
    const points = Number(ctx.match[2]);
    await ctx.editMessageText(
      `Selecciona la carrera a la que quieres ${VERB[type].title} ${points} puntos`,
      await degreeKeyboard(deps, type, points)
    );
    await ctx.answerCbQuery();
  });

  bot.action(/^deg:(add|remove):(\d+):(\d+)$/, async (ctx) => {
    if (!(await requireAdmin(ctx, deps))) return;
    // Remove the keyboard first, so a double tap cannot apply it twice.
    await ctx.deleteMessage().catch(() => undefined);
    await ctx.answerCbQuery();
    await apply(ctx, deps, ctx.match[1] as PointsType, Number(ctx.match[2]), Number(ctx.match[3]));
  });

  bot.action(/^cancel:(add|remove)$/, async (ctx) => {
    await ctx.deleteMessage().catch(() => undefined);
    await ctx.reply(`¡Los puntos no han sido ${VERB[ctx.match[1] as PointsType].done}!`);
    await ctx.answerCbQuery();
  });
};

export default pointsModule;
