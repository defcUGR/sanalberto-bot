import { PrismaClient } from "@prisma/client";
import bunyan from "bunyan";
import { Telegraf } from "telegraf";
import { checkAdmin } from "../utils";
import { v4 as uuidv4 } from "uuid";

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

  // TODO Cache admin token for like 30min

  bot.start(async (ctx) => {
    const noAdmins = (await prisma.admin.count()) === 0;
    ctx.replyWithHTML(
      "¡Bienvenido!\n\nTe presentamos el bot de Telegram para la gestión de los puntos de la Guerra de Carreras de San Alberto este 2023.\n\n" +
        (noAdmins
          ? "<b>No hay ningún administrador registrado, responde a este mensaje con la clave de administrador para registrarte como tal</b>"
          : (await checkAdmin(ctx, prisma, logger))
          ? "Puedes escribirme para consultar el ranking y diferentes datos. Consulta los comandos disponibles con /help."
          : "Eres administrador, puedes modificar puntuaciones y otros datos, al igual que visualizarlos como cualquier no administrador. Consulta los comandos disponibles con /help.")
    );
    if (noAdmins)
      prisma.actions
        .create({
          data: {
            identifier: uuidv4(),
            message_id: ctx.message.message_id,
            type: "admintoken_add",
            data: ctx.message.from.username || "*ERROR*",
          },
        })
        .then((action) => logger.trace({ action }, "action created"));
  });

  logger.trace(
    { token: process.env.ADMIN_TOKEN, is: typeof process.env.ADMIN_TOKEN },
    "token"
  );

  // TODO Delete action after "use"
  // TODO Add expiration i.e. add created_at for action table and check with for example 10 minutes
  bot.hears(process.env.ADMIN_TOKEN, async (ctx) => {
    logger.trace("processing admin token");
    const tokenActions = await prisma.actions.findMany({
      where: {
        type: {
          startsWith: "admintoken_", // TODO Move all this to constants
        },
      },
    });
    tokenActions.forEach((action) => {
      if (action.data === "*ERROR*") {
        // TODO Move this *ERROR* to constant too
        ctx.replyWithHTML(
          "<b>ERROR</b> El bot ha tenido un error procesando la solicitud, el error ha sido registrado y será revisado."
        );
        logger.error(
          { action, ctx, tokenActions },
          "failed to execute action: data contained error flag"
        );
        return;
      }
      switch (action.type) {
        // TODO Maybe check if admin isn't already added? Shouldn't be added  in any way except internal errors, so it could stay like this
        case "admintoken_add":
          prisma.admin
            .create({
              data: {
                username: action.data,
                added_by: "*token*",
              },
            })
            .then((admin) => {
              logger.info({ action, admin }, "registered new admin with token");
              ctx.reply(
                "¡Administrador registrado con éxito! Ya puedes utilizar comandos de administrador"
              );
            })
            .catch((err) => {
              logger.error({ err }, "error interno al registrar administrador");
              ctx.replyWithHTML(
                "<b>ERROR</b> Error interno, contacta con los desarrolladores @comic_ivans o @HipyCas"
              );
            });
          prisma.actions
            .delete({
              where: { id: action.id },
            })
            .then((res) => {
              logger.trace({ action, res }, "removed used action");
            })
            .catch((err) => {
              logger.error(
                { err, action },
                "internal error when removing action"
              );
            });
          break;
      }
    });
  });

  bot.help(async (ctx) =>
    ctx.replyWithHTML(
      (!(await checkAdmin(ctx, prisma, logger))
        ? "<b>COMANDOS PÚBLICOS</b>\n"
        : "") +
        "/ranking: obtén un ranking de las carreras con sus puntuaciones\n/chart: obtener una gráfica decreciente con las puntuaciones de las carreras" +
        (!(await checkAdmin(ctx, prisma, logger))
          ? "\n\n<b>COMANDOS DE ADMINISTRADOR</b>\n/add &lt;puntos&gt;: añade puntos a una carrera\n/remove &lt;puntos&gt;: quita puntos a una carrera\n/add_admin &lt;username&gt;: añade un nuevo administrador\n/admins: muestra una lista de los admins\n/crear_grado &lt;nombre&gt;: crea un grado que pueda faltar en la base de datos"
          : "")
    )
  ); // Make different if its admin
}
