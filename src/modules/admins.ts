import { Telegraf } from "telegraf";
import bunyan from "bunyan";
import { PrismaClient } from "@prisma/client";

import { checkAdmin, requiresAdmin } from "../utils";

export default function adminsModule(
  bot: Telegraf,
  logger: bunyan,
  prisma: PrismaClient
) {
  //* Add admins (must be super-admin)
  bot.command("add_admin", async (ctx) => {
    await requiresAdmin(ctx, prisma, async () => {
      const username = ctx.message.text.split(" ")[1].replace(/^@/, "");
      if (username === undefined)
        ctx.replyWithHTML(
          "<b>ERROR</b> Tienes que proporcionar un nombre de usuario para añadir como administrador: <code>/add_admin &lt;username&gt;</code>"
        );
      else if (
        (await prisma.admin.findUnique({
          where: {
            username,
          },
        })) !== null
      )
        ctx.replyWithHTML(
          "<b>ERROR</b> El administrador que intentas añadir ya está registrado como tal"
        );
      else {
        prisma.admin
          .create({
            data: {
              username,
              added_by: ctx.message.from.username,
            },
          })
          .catch((e) =>
            ctx.replyWithHTML(
              "<b>ERROR</b> Error interno, contacta con los desarrolladores @comic_ivans o @HipyCas"
            )
          )
          .then(() => ctx.replyWithHTML("¡Administrador registrado!"));
        logger.info(
          { username, added_by: ctx.message.from.username },
          "Registrado nuevo administrador"
        );
      }
    });
  });

  //* Remove admins (must be super-admin)
  bot.command("remove_admin", async (ctx) => {
    const username = ctx.message.text.split(" ")[1].replace(/^@/, "");
    if (
      (await prisma.admin.findUnique({
        where: {
          username: ctx.message.from.username,
        },
      })) === null
    )
      ctx.replyWithHTML("<b>COMANDO DE ADMINISTRADOR</b>");
    else {
      if (username === undefined)
        ctx.replyWithHTML(
          "<b>ERROR</b> Tienes que proporcionar un nombre de usuario para eliminar como administrador: <code>/remove_admin &lt;username&gt;</code>"
        );
      else if (
        username.toLowerCase() === "hipycas" ||
        username.toLowerCase() === "comic_ivans"
      )
        ctx.replyWithHTML(
          "<b>ERROR</b> No se puede eliminar a este administrador"
        );
      else if (
        (await prisma.admin.findUnique({
          where: {
            username,
          },
        })) === null
      )
        ctx.replyWithHTML(
          "<b>ERROR</b> El administrador que intentas eliminar no está registrado ya"
        );
      else
        prisma.admin
          .delete({
            where: {
              username,
            },
          })
          .then(() => ctx.reply("¡Administrador correctamente eliminado!"));
    }
  });

  //* List admins (must be super-admin)
  bot.command("admins", async (ctx) => {
    await requiresAdmin(ctx, prisma, async () => {
      logger.info("Processing /admins");
      ctx.replyWithHTML(
        (await prisma.admin.findMany()).reduce(
          (prev, curr) => (prev += "@" + curr.username + "\n"),
          "<b>ADMINS</b>\n"
        )
      );
    });
  });
}
