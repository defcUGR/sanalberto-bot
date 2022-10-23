import { PrismaClient } from "@prisma/client";
import bunyan from "bunyan";
import { Telegraf } from "telegraf";

export default function baseModule(
  bot: Telegraf,
  logger: bunyan,
  prisma: PrismaClient
) {
  bot.use(async (ctx, next) => {
    logger.trace(
      { message: ctx.message, cb: ctx.callbackQuery },
      "message received"
    );
    next();
  });

  bot.start((ctx) =>
    ctx.reply(
      "¡Bienvenido!\n\nTe presentamos el bot de Telegram para la gestión de los puntos de la Guerra de Carreras de San Alberto este 2023.\n\n Si eres administrador, podrás modificar los puntos de las carreras, o en caso de no serlo podrás consultar los puntos de una carrera o la clasificación general."
    )
  );

  bot.help((ctx) => ctx.reply("Send me a sticker")); // Make different if its admin
}
