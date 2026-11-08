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
