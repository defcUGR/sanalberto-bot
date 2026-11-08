import { Telegraf } from "telegraf";
import { config } from "./config";
import adminsModule from "./modules/admins";
import baseModule from "./modules/base";
import degreesModule from "./modules/db";
import displayModule from "./modules/display";
import editionsModule from "./modules/editions";
import historyModule from "./modules/history";
import pointsModule from "./modules/points";
import { INTERNAL_ERROR, type BotDeps } from "./telegram";

export type BotModule = (bot: Telegraf, deps: BotDeps) => void;

export function createBot(deps: BotDeps): Telegraf {
  const bot = new Telegraf(config.botToken);

  // Without this, an error in any handler stops the whole process.
  bot.catch(async (err, ctx) => {
    deps.logger.error({ err, update: ctx.update.update_id, from: ctx.from?.username }, "handler error");
    try {
      if (ctx.callbackQuery) await ctx.answerCbQuery("Error interno", { show_alert: true });
      else await ctx.replyWithHTML(INTERNAL_ERROR);
    } catch {
      // The chat may be gone; the error is already logged.
    }
  });

  const modules: BotModule[] = [
    baseModule,
    adminsModule,
    degreesModule,
    pointsModule,
    historyModule,
    editionsModule,
    displayModule,
  ];
  for (const register of modules) register(bot, deps);
  return bot;
}
