import { PrismaClient } from "@prisma/client";
import bunyan from "bunyan";
import { Telegraf, Markup } from "telegraf";

import { requiresAdmin, createGroupedArray } from "../utils";
import { v4 as uuidv4 } from "uuid";

export default function pointsModule(
  bot: Telegraf,
  logger: bunyan,
  prisma: PrismaClient
) {
  bot.command("add", async (ctx) => {
    // Check if its admin
    requiresAdmin(ctx, prisma, async () => {
      const args = ctx.message.text.split(" ");
      // Parse points
      if (args[1] === undefined) {
        ctx.replyWithHTML(
          "<b>ERROR</b> Debes especificar los puntos a añadir: <code>/add &lt;puntos&gt;</code>"
        );
        return;
      }
      const points = (() => {
        try {
          return parseInt(args[1]);
        } catch (e) {
          ctx.replyWithHTML(
            "<b>ERROR</b> Los puntos tienen que ser un número entero"
          );
          return undefined;
        }
      })();
      logger.trace(
        {
          args,
          unparsedPoints: args[1],
          points,
        },
        "Adding points"
      );
      // Get degree
      // const degree = await prisma.degree.findUnique({
      //   where: {
      //     name: degree_name,
      //   },
      // });
      // Report degree not found
      // if (degree.name === null) {
      //   ctx.replyWithHTML(
      //     `<b>ERROR</b> No se ha encontrado el grado ${degree.name}`
      //   );
      // }
      // // Update points
      // else {
      //   prisma.degree
      //     .update({
      //       where: {
      //         name: degree_name,
      //       },
      //       data: {
      //         points: degree.points + points,
      //       },
      //     })
      //     .then(() =>
      //       ctx.reply(
      //         `¡Puntos añadidos! El grado ${degree_name} con ${
      //           degree.points + points
      //         }`
      //       )
      //     );
      // }
      const uuid = uuidv4();
      logger.trace({
        str: `add_<degree_name>_${points}_${uuid}`,
        uuid,
        buttons: [
          ...createGroupedArray(
            (await prisma.degree.findMany())
              .map((degree) => degree.name)
              .sort()
              .map((name) =>
                Markup.button.callback(
                  name,
                  `add_${name.toLowerCase()}_${points}_${uuid}`
                )
              ),
            2
          ),
          [Markup.button.callback("Cancelar", `add_cancel_${uuid}`)],
        ],
      });
      const msg = await ctx.reply(
        "Selecciona el grado al que quieres sumarle los puntos",
        {
          ...Markup.inlineKeyboard([
            ...createGroupedArray(
              (
                await prisma.degree.findMany()
              )
                .map((degree) => degree.name)
                .sort()
                .map((name) =>
                  Markup.button.callback(name, `add_${name}_${points}_${uuid}`)
                ),
              2
            ),
            [Markup.button.callback("Cancelar", `add_cancel_${uuid}`)],
          ]),
        }
      );
      await prisma.actions.create({
        data: {
          identifier: uuid,
          message_id: msg.message_id,
        },
      });
    });
  });

  bot.command("remove", async (ctx) => {
    requiresAdmin(ctx, prisma, async () => {
      const args = ctx.message.text.split(" ");
      // Parse points
      if (args[1] === undefined) {
        ctx.replyWithHTML(
          "<b>ERROR</b> Debes especificar los puntos a eliminar: <code>/remove &lt;puntos&gt;</code>"
        );
        return;
      }
      const points = (() => {
        try {
          return parseInt(args[1]);
        } catch (e) {
          ctx.replyWithHTML(
            "<b>ERROR</b> Los puntos tienen que ser un número entero"
          );
          return undefined;
        }
      })();
      logger.trace(
        {
          args,
          unparsedPoints: args[1],
          points,
        },
        "Removing points"
      );
      const uuid = uuidv4();
      const buttons = [
        ...createGroupedArray(
          (await prisma.degree.findMany())
            .map((degree) => degree.name)
            .sort()
            .map((name) =>
              Markup.button.callback(name, `remove_${name}_${points}_${uuid}`)
            ),
          2
        ),
        [Markup.button.callback("Cancelar", `remove_cancel_${uuid}`)],
      ];
      logger.trace({
        str: `remove_<degree_name>_${points}_${uuid}`,
        uuid,
        buttons,
      });
      const msg = await ctx.reply(
        "Selecciona el grado al que quieres sumarle los puntos",
        {
          ...Markup.inlineKeyboard(buttons),
        }
      );
      await prisma.actions.create({
        data: {
          identifier: uuid,
          message_id: msg.message_id,
        },
      });
    });
  });

  bot.action(/(add|remove)_([\wáéíóúÁÉÍÓÚ]+)_([0-9]+)_(.+)/, async (ctx) => {
    logger.trace(
      {
        matches: ctx.match,
        action: ctx.match[1],
        degree: ctx.match[2],
        points: ctx.match[3],
        uuid: ctx.match[4],
      },
      `Handling ${
        ctx.match[1] === "add" ? "adding" : "removing"
      } points to degree`
    );
    ctx.deleteMessage(
      (
        await prisma.actions.findUnique({
          where: {
            identifier: ctx.match[4],
          },
        })
      ).message_id
    );
    const degree = await prisma.degree.update({
      where: {
        name: ctx.match[2],
      },
      data: {
        points: {
          [ctx.match[1] === "add" ? "increment" : "decrement"]: parseInt(
            ctx.match[3]
          ),
        },
      },
    });
    ctx.reply(
      `¡Puntos ${
        ctx.match[1] === "add" ? "añadidos" : "eliminados"
      }! El grado ${degree.name} con ${degree.points}`
    );
    ctx.answerCbQuery();
  });

  bot.action(/(add|remove)_cancel_(.+)/, async (ctx) => {
    logger.trace({
      matches: ctx.match,
      action: ctx.match[1],
      uuid: ctx.match[2],
    });
    ctx.deleteMessage(
      (
        await prisma.actions.findUnique({
          where: {
            identifier: ctx.match[2],
          },
        })
      ).message_id
    );
    ctx.reply(
      `¡Los puntos no han sido ${
        ctx.match[1] === "add" ? "añadidos" : "eliminados"
      }!`
    );
    ctx.answerCbQuery();
  });
}
