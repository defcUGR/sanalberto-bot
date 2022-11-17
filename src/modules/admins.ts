import { Telegraf } from "telegraf";
import bunyan from "bunyan";

import { requiresAdmin } from "../utils";
import { DataBase } from "../db";

export default function adminsModule(
  bot: Telegraf,
  logger: bunyan,
  db: DataBase
) {
  //* Add admins (must be super-admin)
  bot.command("add_admin", async (ctx) => {
    await requiresAdmin(ctx, db, async () => {
      const username = ctx.message.text.split(" ")[1].replace(/^@/, "");
      logger.trace({ username }, "registrando nuevo admin");
      if (username === undefined)
        ctx.replyWithHTML(
          "<b>ERROR</b> Tienes que proporcionar un nombre de usuario para añadir como administrador: <code>/add_admin &lt;username&gt;</code>"
        );
      else if (
        (await db.prisma.admin.findUnique({ where: { username } })) !== null
      )
        ctx.replyWithHTML(
          "<b>ERROR</b> El administrador que intentas añadir ya está registrado como tal"
        );
      else {
        db.adminCreate({
          username,
          added_by: ctx.message.from.username,
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
    const raw_username = ctx.message.text.split(" ")[1];
    const username = (raw_username || "").replace(/^@/, "");
    await requiresAdmin(ctx, db, async () => {
      if (raw_username === undefined)
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
        (await db.prisma.admin.findUnique({ where: { username } })) === null
      )
        ctx.replyWithHTML(
          "<b>ERROR</b> El administrador que intentas eliminar no está registrado ya"
        );
      else
        db.adminDelete({ username }).then(() =>
          ctx.reply("¡Administrador correctamente eliminado!")
        );
    });
  });

  //* List admins (must be super-admin)
  bot.command("admins", async (ctx) => {
    await requiresAdmin(ctx, db, async () => {
      logger.info("Processing /admins");
      ctx.replyWithHTML(
        (await db.admins()).reduce(
          (prev, curr) => (prev += "@" + curr.username + "\n"),
          "<b>ADMINS</b>\n"
        )
      );
    });
  });
}
