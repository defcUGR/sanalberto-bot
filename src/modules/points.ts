import { Markup } from "telegraf";

import { createGroupedArray, pointsButtons } from "../utils";
import { v4 as uuidv4 } from "uuid";
import { CommandParams } from "../bot";

export default function pointsModule({
  bot,
  telegraf,
  db,
  logger,
}: CommandParams) {
  bot.adminCommand("add", async (ctx) => {
    // const args = ctx.message.text.split(" ");
    // // Parse points
    // if (args[1] === undefined) {
    //   ctx.replyWithHTML(
    //     "<b>ERROR</b> Debes especificar los puntos a añadir: <code>/add &lt;puntos&gt;</code>"
    //   );
    //   return;
    // }
    // const points = (() => {
    //   try {
    //     return parseInt(args[1]);
    //   } catch (e) {
    //     ctx.replyWithHTML(
    //       "<b>ERROR</b> Los puntos tienen que ser un número entero"
    //     );
    //     return undefined;
    //   }
    // })();
    // logger.trace(
    //   {
    //     args,
    //     unparsedPoints: args[1],
    //     points,
    //   },
    //   "Adding points"
    // );
    logger.trace("adding points");
    // logger.trace({
    //   str: `add_<degree_name>_<selected_points>_${uuid}`,
    //   uuid,
    //   buttons: [
    //     ...createGroupedArray(
    //       (await db.prisma.degree.findMany())
    //         .map((degree) => degree.name)
    //         .sort()
    //         .map((name) =>
    //           Markup.button.callback(
    //             name,
    //             `add_${name.toLowerCase()}_<_${uuid}`
    //           )
    //         ),
    //       2
    //     ),
    //     [Markup.button.callback("Cancelar", `add_cancel_${uuid}`)],
    //   ],
    // });
    const uuid = uuidv4();
    await pointsButtons(ctx, "add", uuid);
  });

  bot.adminCommand("remove", async (ctx) => {
    logger.trace("Removing points");
    const uuid = uuidv4();
    await pointsButtons(ctx, "remove", uuid);
  });

  telegraf.action(/(add|remove)_([0-9]+)_(.+)/, async (ctx) => {
    const args = ctx.match;

    logger.trace(
      {
        args,
        action: args[1],
        points: args[2],
        uuid: args[3],
      },
      "add points"
    );

    // {[args[1] === "add" ? "increment" : "decrement"]: parseInt(
    //   args[2]
    // )}

    // const action = (await db.pointActions()).find(
    //   (action) => action.identifier === args[3]
    // );
    const uuid = uuidv4();

    const buttons = {
      ...Markup.inlineKeyboard([
        ...createGroupedArray(
          (await db.prisma.degree.findMany({ select: { name: true } }))
            .sort()
            .map(({ name }) =>
              Markup.button.callback(
                name,
                `${args[1]}_${name}_${args[2]}_${uuid}`
              )
            ),
          2
        ),
        [Markup.button.callback("Cancelar", `add_cancel_${uuid}`)],
      ]),
    };

    logger.trace({ buttons }, "performing action");

    const msg = await ctx.reply(
      "Selecciona el grado al que quieres sumarle los puntos",
      buttons
    );

    ctx.deleteMessage(ctx.callbackQuery.message.message_id);

    // db.actionClear(action);

    // await db.actionCreate(
    //   ctx,
    //   PointManagement.AddSelectPoints,
    //   msg.message_id.toString(),
    //   uuid
    // );
    ctx.answerCbQuery();
  });

  telegraf.action(
    /(add|remove)_([\wáéíóúÁÉÍÓÚ .]+)_([0-9]+)_(.+)/,
    async (ctx) => {
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
      ctx.deleteMessage(ctx.callbackQuery.message.message_id);
      let degree = await db.prisma.degree.update({
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
      if (degree.points < 0) {
        degree = await db.prisma.degree.update({
          where: {
            name: ctx.match[2],
          },
          data: {
            points: 0,
          },
        });
      }
      ctx.reply(
        `¡Puntos ${
          ctx.match[1] === "add" ? "añadidos" : "eliminados"
        }! El grado ${degree.name} con ${degree.points}`
      );
      ctx.answerCbQuery();
    }
  );

  telegraf.action(/(add|remove)_cancel_(.+)/, async (ctx) => {
    logger.trace(
      {
        matches: ctx.match,
        action: ctx.match[1],
        uuid: ctx.match[2],
      },
      "cancel"
    );
    ctx.deleteMessage(ctx.callbackQuery.message.message_id);
    ctx.reply(
      `¡Los puntos no han sido ${
        ctx.match[1] === "add" ? "añadidos" : "eliminados"
      }!`
    );
    ctx.answerCbQuery();
  });
}
