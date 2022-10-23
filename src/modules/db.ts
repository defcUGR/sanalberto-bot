import { PrismaClient } from "@prisma/client";
import bunyan from "bunyan";
import { Telegraf } from "telegraf";

export default function dbModule(
  bot: Telegraf,
  logger: bunyan,
  prisma: PrismaClient
) {
  bot.command("crear_grado", async (ctx) => {
    const is_admin = await prisma.admin.findUnique({
      where: {
        username: ctx.message.from.username,
      },
    });
    if (is_admin === null) ctx.replyWithHTML("<b>COMANDO DE ADMINISTRADOR</b>");
    else {
      const name = ctx.message.text.split(" ")[1];
      if (name === undefined)
        ctx.replyWithHTML(
          "<b>ERROR</b> Tienes que proporcionar un nombre para crear un grado: <code>/crear_grado &lt;nombre&gt;</code>"
        );
      else if (
        (await prisma.degree.findUnique({
          where: {
            name,
          },
        })) !== null
      )
        ctx.replyWithHTML(
          "<b>ERROR</b> El grado que intentas añadir ya está registrado como tal"
        );
      else
        prisma.degree
          .create({
            data: {
              name,
            },
          })
          .catch((e) =>
            ctx.replyWithHTML(
              "<b>ERROR</b> Error interno, contacta con los desarrolladores @comic_ivans o @HipyCas"
            )
          )
          .then(() => ctx.replyWithHTML("¡Grado registrado!"));
    }
  });
}
