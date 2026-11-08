import { Markup } from "telegraf";
import type { BotModule } from "../bot";
import {
  commandArgs,
  escapeHtml,
  formatNumber,
  parseNumber,
  requireAdmin,
  requireSuperAdmin,
  who,
} from "../telegram";

// Degrees and edition settings: create, delete, weights and the yearly reset.

/** Splits "Ing. Química 2,4" into the name and an optional trailing number. */
function nameAndNumber(args: string): { name: string; value: number | null } {
  const parts = args.split(/\s+/).filter(Boolean);
  const last = parseNumber(parts.at(-1));
  if (parts.length > 1 && last !== null) return { name: parts.slice(0, -1).join(" "), value: last };
  return { name: parts.join(" "), value: null };
}

const degreesModule: BotModule = (bot, deps) => {
  const { db, live } = deps;

  bot.command("crear_grado", async (ctx) => {
    if (!(await requireAdmin(ctx, deps))) return;
    const { name, value } = nameAndNumber(commandArgs(ctx));
    if (!name) {
      await ctx.replyWithHTML(
        "<b>ERROR</b> Tienes que proporcionar un nombre para crear un grado: <code>/crear_grado &lt;nombre&gt; [peso]</code>"
      );
      return;
    }
    if (name.length > 30) {
      await ctx.replyWithHTML("<b>ERROR</b> El nombre puede tener como máximo 30 caracteres");
      return;
    }
    if (await db.degreeByName(name)) {
      await ctx.replyWithHTML("<b>ERROR</b> Ese grado ya está registrado");
      return;
    }
    const weight = value ?? 1;
    if (weight <= 0) {
      await ctx.replyWithHTML("<b>ERROR</b> El peso tiene que ser mayor que 0");
      return;
    }
    await db.createDegree(name, weight, who(ctx));
    await live.refresh();
    await ctx.replyWithHTML(`¡Grado <b>${escapeHtml(name)}</b> registrado con peso ${formatNumber(weight)}!`);
  });

  bot.command("eliminar_grado", async (ctx) => {
    if (!(await requireSuperAdmin(ctx, deps))) return;
    const name = commandArgs(ctx);
    if (!name) {
      await ctx.replyWithHTML(
        "<b>ERROR</b> Tienes que proporcionar un nombre para eliminar un grado: <code>/eliminar_grado &lt;nombre&gt;</code>"
      );
      return;
    }
    if (!(await db.degreeByName(name))) {
      await ctx.replyWithHTML("<b>ERROR</b> Ese grado no está registrado");
      return;
    }
    await db.deleteDegree(name, who(ctx));
    await live.refresh();
    await ctx.replyWithHTML(`¡Grado <b>${escapeHtml(name)}</b> eliminado!`);
  });

  bot.command("pesos", async (ctx) => {
    if (!(await requireAdmin(ctx, deps))) return;
    const degrees = [...(await db.degrees())].sort((a, b) => a.name.localeCompare(b.name));
    await ctx.replyWithHTML(
      "<b>PESOS</b> (puntos que recibe cada carrera por cada punto concedido)\n\n" +
        degrees.map((d) => `${escapeHtml(d.name)}: <code>${formatNumber(d.weight)}</code>`).join("\n")
    );
  });

  bot.command("peso", async (ctx) => {
    if (!(await requireAdmin(ctx, deps))) return;
    const { name, value } = nameAndNumber(commandArgs(ctx));
    if (!name || value === null || value <= 0) {
      await ctx.replyWithHTML(
        "<b>ERROR</b> Uso: <code>/peso &lt;carrera&gt; &lt;peso&gt;</code>, con un peso mayor que 0 (por ejemplo <code>/peso Física 1,4</code>)"
      );
      return;
    }
    if (!(await db.degreeByName(name))) {
      await ctx.replyWithHTML("<b>ERROR</b> Ese grado no está registrado");
      return;
    }
    const degree = await db.setWeight(name, value, who(ctx));
    await ctx.replyWithHTML(`Peso de <b>${escapeHtml(degree.name)}</b>: ${formatNumber(degree.weight)}`);
  });

  bot.command("reiniciar_puntos", async (ctx) => {
    if (!(await requireSuperAdmin(ctx, deps))) return;
    await ctx.replyWithHTML(
      "<b>¿Seguro?</b> Todas las carreras volverán a 0 puntos y se borrará el historial. Haz antes una copia de la base de datos si quieres conservar la edición anterior.",
      Markup.inlineKeyboard([
        Markup.button.callback("Sí, reiniciar", "reset:yes"),
        Markup.button.callback("Cancelar", "reset:no"),
      ])
    );
  });

  bot.action(/^reset:(yes|no)$/, async (ctx) => {
    if (!(await requireSuperAdmin(ctx, deps))) return;
    await ctx.deleteMessage().catch(() => undefined);
    if (ctx.match[1] === "yes") {
      await db.resetPoints(who(ctx));
      await live.refresh();
      await ctx.reply("Puntos reiniciados. ¡Buena edición!");
    } else {
      await ctx.reply("Los puntos no se han reiniciado.");
    }
    await ctx.answerCbQuery();
  });
};

export default degreesModule;
