import { PrismaClient } from "@prisma/client";
import bunyan from "bunyan";
import { Telegraf } from "telegraf";
import { DataBase } from "../db";
import { requiresAdmin } from "../utils";

export default function dbModule(bot: Telegraf, logger: bunyan, db: DataBase) {
  bot.command("crear_grado", async (ctx) => {
    ctx.replyWithHTML("<b>FUNCIÓN DESHABILITADA</b>");
    // await requiresAdmin(ctx, db, async () => {
    //   const name = ctx.message.text.split(" ").slice(1).join(" ");
    //   if (name === undefined)
    //     ctx.replyWithHTML(
    //       "<b>ERROR</b> Tienes que proporcionar un nombre para crear un grado: <code>/crear_grado &lt;nombre&gt;</code>"
    //     );
    //   else if ((await db.degree({ name })) !== null)
    //     ctx.replyWithHTML(
    //       "<b>ERROR</b> El grado que intentas añadir ya está registrado como tal"
    //     );
    //   else
    //     db.degreeCreate({ name }, { success: { created_by: ctx.message.from } })
    //       .catch((e) =>
    //         ctx.replyWithHTML(
    //           "<b>ERROR</b> Error interno, contacta con los desarrolladores @comic_ivans o @HipyCas"
    //         )
    //       )
    //       .then(() => ctx.replyWithHTML("¡Grado registrado!"));
    // });
  });

  bot.command("eliminar_grado", async (ctx) => {
    ctx.replyWithHTML("<b>FUNCIÓN DESHABILITADA</b>");
    // await requiresAdmin(ctx, db, async () => {
    //   const name = ctx.message.text.split(" ").slice(1).join(" ");
    //   if (name === undefined)
    //     ctx.replyWithHTML(
    //       "<b>ERROR</b> Tienes que proporcionar un nombre para eliminar un grado: <code>/eliminar_grado &lt;nombre&gt;</code>"
    //     );
    //   else if ((await db.degree({ name })) === null)
    //     ctx.replyWithHTML(
    //       "<b>ERROR</b> El grado que intentas eliminar no está registrado como tal"
    //     );
    //   else
    //     db.degreeDelete(
    //       { name },
    //       {
    //         success: { action_by: ctx.message.from },
    //         error: { action_by: ctx.message.from },
    //       }
    //     )
    //       // TODO Log error here
    //       .catch((e) =>
    //         ctx.replyWithHTML(
    //           "<b>ERROR</b> Error interno, contacta con los desarrolladores @comic_ivans o @HipyCas"
    //         )
    //       )
    //       .then(() => ctx.replyWithHTML("¡Grado eliminado!"));
    // });
  });
}
