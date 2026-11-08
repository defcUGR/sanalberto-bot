import { Markup } from "telegraf";
import type { BotModule } from "../bot";
import type { Standing } from "../db";
import { commandArgs, escapeHtml, requireAdmin, requireSuperAdmin, who } from "../telegram";

// Editions (one per year), the frozen scoreboard and the CSV export.

const MEDALS = ["\u{1F947}", "\u{1F948}", "\u{1F949}"];

// "2026-11-15 18:30:05": sorts well and spreadsheets read it as a date.
const DATE = new Intl.DateTimeFormat("sv-SE", {
  dateStyle: "short",
  timeStyle: "medium",
  timeZone: process.env.TZ || "Europe/Madrid",
});

export function standingsText(standings: Standing[]): string {
  return standings
    .map(
      (s, i) =>
        `${i === 3 ? "\n" : ""}${MEDALS[i] ?? "\u{1F19A}"} ${escapeHtml(s.degree)} <code>${s.points}</code>`
    )
    .join("\n");
}

/** CSV for spreadsheets in Spanish: semicolons, BOM, quoted text. */
function csv(rows: (string | number)[][]): Buffer {
  const cell = (v: string | number) =>
    typeof v === "number" ? String(v) : `"${v.replace(/"/g, '""')}"`;
  return Buffer.from("﻿" + rows.map((r) => r.map(cell).join(";")).join("\r\n") + "\r\n");
}

function parseYear(text: string): number | null {
  const year = Number(text.trim());
  return Number.isInteger(year) && year >= 2000 && year <= 2100 ? year : null;
}

const editionsModule: BotModule = (bot, deps) => {
  const { db, live } = deps;

  // ─── Frozen scoreboard ───────────────────────────────────────────────────

  bot.command("congelar", async (ctx) => {
    if (!(await requireAdmin(ctx, deps))) return;
    const edition = await db.freeze(who(ctx));
    if (!edition) {
      await ctx.reply("El marcador ya estaba congelado. Usa /revelar para mostrarlo.");
      return;
    }
    await live.refresh();
    await ctx.replyWithHTML(
      "❄️ <b>Marcador congelado.</b> La web, /ranking y /chart muestran los puntos de este momento para el público; los admins seguís sumando y veis el marcador real. Usa /revelar para la revelación final."
    );
  });

  bot.command("revelar", async (ctx) => {
    if (!(await requireAdmin(ctx, deps))) return;
    const edition = await db.unfreeze(who(ctx));
    if (!edition) {
      await ctx.reply("El marcador no está congelado.");
      return;
    }
    await live.reveal();
    await ctx.replyWithHTML("🎉 <b>¡Marcador revelado!</b> La web está mostrando los resultados.");
  });

  // ─── Editions ────────────────────────────────────────────────────────────

  bot.command("ediciones", async (ctx) => {
    const editions = await db.editions();
    await ctx.replyWithHTML(
      "<b>EDICIONES</b>\n\n" +
        editions
          .map(({ edition, standings }) => {
            const winner = standings[0];
            const label = edition.closed_at ? "" : " (en curso)";
            return `<b>${edition.year}</b>${label}: ${winner && winner.points > 0 ? `${MEDALS[0]} ${escapeHtml(winner.degree)} <code>${winner.points}</code>` : "sin puntos todavía"}`;
          })
          .join("\n") +
        "\n\nConsulta una con /edicion &lt;año&gt;"
    );
  });

  bot.command("edicion", async (ctx) => {
    const year = parseYear(commandArgs(ctx));
    if (!year) {
      await ctx.replyWithHTML("Uso: <code>/edicion 2025</code>. Las disponibles están en /ediciones.");
      return;
    }
    const summary = await db.edition(year);
    if (!summary) {
      await ctx.reply(`No hay datos de la edición ${year}. Las disponibles están en /ediciones.`);
      return;
    }
    const open = !summary.edition.closed_at;
    // The open edition, while frozen, is shown as the public sees it.
    const standings =
      open && summary.edition.frozen_at
        ? (await db.publicDegrees(summary.edition))
            .sort((a, b) => b.points - a.points)
            .map((d, i) => ({ position: i + 1, degree: d.name, points: d.points }))
        : summary.standings;
    await ctx.replyWithHTML(
      `<b>\u{1F3C6} SAN ALBERTO ${year}${open ? " (en curso)" : ""} \u{1F3C6}</b>\n\n${standingsText(standings)}`
    );
  });

  bot.command("nueva_edicion", async (ctx) => {
    if (!(await requireSuperAdmin(ctx, deps))) return;
    const current = await db.currentEdition();
    const year = parseYear(commandArgs(ctx));
    if (!year || year <= current.year) {
      await ctx.replyWithHTML(
        `Uso: <code>/nueva_edicion ${current.year + 1}</code>, con un año posterior a la edición en curso (${current.year}).`
      );
      return;
    }
    const top = (await db.degrees()).slice(0, 3);
    await ctx.replyWithHTML(
      `<b>¿Cerrar la edición ${current.year} y empezar la ${year}?</b>\n\n` +
        `La clasificación de ${current.year} quedará guardada tal como está ahora (${top.map((d) => `${escapeHtml(d.name)} ${d.points}`).join(", ")}…) y todas las carreras empezarán ${year} con 0 puntos. Los pesos se mantienen.`,
      Markup.inlineKeyboard([
        Markup.button.callback(`Sí, empezar ${year}`, `edition:new:${year}`),
        Markup.button.callback("Cancelar", "edition:cancel"),
      ])
    );
  });

  bot.action(/^edition:(new:(\d{4})|cancel)$/, async (ctx) => {
    if (!(await requireSuperAdmin(ctx, deps))) return;
    await ctx.deleteMessage().catch(() => undefined);
    await ctx.answerCbQuery();
    const year = ctx.match[2] ? Number(ctx.match[2]) : null;
    if (!year) {
      await ctx.reply("No se ha cambiado de edición.");
      return;
    }
    const current = await db.currentEdition();
    if (year <= current.year) {
      await ctx.reply(`La edición en curso ya es la ${current.year}.`);
      return;
    }
    const { closed, opened } = await db.newEdition(year, who(ctx));
    await live.refresh();
    await ctx.replyWithHTML(
      `Edición ${closed.edition.year} cerrada y guardada:\n\n${standingsText(closed.standings)}\n\n` +
        `¡Empieza San Alberto ${opened.year}! Todas las carreras están a 0. Revisa los pesos con /pesos.`
    );
  });

  // ─── Export ──────────────────────────────────────────────────────────────

  bot.command("exportar", async (ctx) => {
    if (!(await requireAdmin(ctx, deps))) return;
    const args = commandArgs(ctx);
    const year = args ? parseYear(args) : (await db.currentEdition()).year;
    const summary = year ? await db.edition(year) : null;
    if (!year || !summary) {
      await ctx.replyWithHTML("Uso: <code>/exportar [año]</code>. Las ediciones están en /ediciones.");
      return;
    }
    const events = await db.editionEvents(summary.edition.id);
    await ctx.sendChatAction("upload_document");
    await ctx.replyWithDocument(
      {
        source: csv([
          ["Posición", "Carrera", "Puntos"],
          ...summary.standings.map((s) => [s.position, s.degree, s.points]),
        ]),
        filename: `sanalberto-${year}-clasificacion.csv`,
      },
      { caption: `Clasificación de ${year}${summary.edition.closed_at ? "" : " (real, en curso)"}` }
    );
    if (!events.length) {
      await ctx.reply(`La edición ${year} no tiene movimientos registrados.`);
      return;
    }
    await ctx.replyWithDocument(
      {
        source: csv([
          ["Fecha", "Carrera", "Tipo", "Puntos", "Admin"],
          ...events.map((e) => [
            DATE.format(e.timestamp),
            e.Degree.name,
            e.type === 1 ? "Suma" : "Resta",
            e.type === 1 ? e.points : -e.points,
            e.username,
          ]),
        ]),
        filename: `sanalberto-${year}-movimientos.csv`,
      },
      { caption: `${events.length} movimientos de ${year}` }
    );
  });
};

export default editionsModule;
