import type { Context } from "telegraf";
import type { DataBase } from "./db";
import type { LiveServer } from "./live";
import type { Logger } from "./logger";

export interface BotDeps {
  db: DataBase;
  logger: Logger;
  live: LiveServer;
}

export const INTERNAL_ERROR =
  "<b>ERROR</b> Error interno, contacta con los desarrolladores @comic_ivans o @HipyCas";

export function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Who did something, for the logs and the points history. */
export function who(ctx: Context): string {
  const from = ctx.from;
  if (!from) return "*desconocido*";
  return from.username ?? `id:${from.id}`;
}

/** Text after the command (`/cmd text` → `text`). */
export function commandArgs(ctx: Context): string {
  const text = ctx.text ?? "";
  return text.replace(/^\/\S+\s*/, "").trim();
}

async function deny(ctx: Context, message: string) {
  if (ctx.callbackQuery) await ctx.answerCbQuery(message, { show_alert: true });
  else await ctx.replyWithHTML(`<b>${message}</b>`);
}

/** Replies and returns false unless the sender is an admin. */
export async function requireAdmin(ctx: Context, { db }: BotDeps): Promise<boolean> {
  if (ctx.from && (await db.findAdmin(ctx.from))) return true;
  await deny(ctx, "COMANDO DE ADMINISTRADOR");
  return false;
}

/** Replies and returns false unless the sender is a super admin. */
export async function requireSuperAdmin(ctx: Context, deps: BotDeps): Promise<boolean> {
  if (!(await requireAdmin(ctx, deps))) return false;
  if (ctx.from && deps.db.isSuperAdmin(ctx.from)) return true;
  await deny(ctx, "SOLO PARA SUPERADMINISTRADORES");
  return false;
}

/** Parses a decimal number written with a dot or a comma. */
export function parseNumber(text: string | undefined): number | null {
  if (!text) return null;
  const value = Number(text.replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

/** Number with a decimal comma, as written in Spanish. */
export function formatNumber(value: number): string {
  return value.toLocaleString("es-ES", { maximumFractionDigits: 2 });
}

/** Lowercase, no accents, only letters and digits ("Ing. Química" → "ingquimica"). */
export function normalizeName(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Finds a degree by a loosely written name, ignoring case, accents and
 * punctuation: an exact match; else every written word matching the start of
 * a word of the name or the other way round ("ingenieria quimica" → "Ing.
 * Química", "fis" → "Física"); else a prefix or substring of the whole name.
 * Returns the candidates when it is ambiguous.
 */
export function findDegree<T extends { name: string }>(
  degrees: T[],
  query: string,
  aliases: (name: string) => string[] = () => []
): { match: T } | { candidates: T[] } {
  const words = (text: string) => text.split(/[\s.]+/).map(normalizeName).filter(Boolean);
  const wanted = normalizeName(query);
  const queryWords = words(query);
  if (!wanted) return { candidates: [] };
  const named = degrees.map((d) => ({ d, n: normalizeName(d.name), w: words(d.name) }));
  const tests = [
    (x: (typeof named)[number]) => x.n === wanted,
    (x: (typeof named)[number]) => aliases(x.d.name).some((a) => normalizeName(a) === wanted),
    (x: (typeof named)[number]) =>
      queryWords.every((q) => x.w.some((w) => w.startsWith(q) || (w.length >= 2 && q.startsWith(w)))),
    (x: (typeof named)[number]) => x.n.startsWith(wanted),
    (x: (typeof named)[number]) => x.n.includes(wanted),
  ];
  for (const test of tests) {
    const found = named.filter(test);
    if (found.length === 1) return { match: found[0]!.d };
    if (found.length > 1) return { candidates: found.map((x) => x.d) };
  }
  return { candidates: [] };
}
