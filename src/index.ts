import { Context, Markup, Telegraf } from "telegraf";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import bunyan from "bunyan";
import { v4 as uuidv4 } from "uuid";

const createGroupedArray = function (arr, chunkSize) {
  let groups = [];
  for (let i = 0; i < arr.length; i += chunkSize) {
    groups.push(arr.slice(i, i + chunkSize));
  }
  return groups;
};

async function checkAdmin(ctx: Context) {
  return (
    (await prisma.admin.findUnique({
      where: {
        username: ctx.message.from.username,
      },
    })) === null
  );
} // Simplify admin check routine with error when not an admin, or maybe take a parameter that is a callback to execute in the else

async function requiresAdmin(ctx: Context, fn: () => Promise<any>) {
  if (!checkAdmin(ctx)) ctx.replyWithHTML("<b>COMANDO DE ADMINISTRADOR</b>");
  else await fn();
}

dotenv.config();

const prisma = new PrismaClient();
const logger = bunyan.createLogger({
  name: "sanalberto-bot",
  streams: [
    {
      level: "trace",
      stream: process.stdout,
    },
    {
      level: "error",
      path: "./error.log",
    },
    {
      level: "trace",
      path: "./trace.log",
    },
  ],
});

console.log(JSON.stringify(process.env));

if (process.env.BOT_TOKEN === undefined) {
  console.error("Provide BOT_TOKEN environment variable to use");
  process.exitCode = 1;
} else {
  const bot = new Telegraf(process.env.BOT_TOKEN);

  bot.start((ctx) =>
    ctx.reply(
      "¡Bienvenido!\n\nTe presentamos el bot de Telegram para la gestión de los puntos de la Guerra de Carreras de San Alberto este 2023.\n\n Si eres administrador, podrás modificar los puntos de las carreras, o en caso de no serlo podrás consultar los puntos de una carrera o la clasificación general."
    )
  );

  bot.use(async (ctx, next) => {
    logger.trace({ message: ctx.message }, "message received");
    next();
  });

  bot.command("test", (ctx) =>
    ctx.reply(
      "**Testing things:** " +
        ctx.message.text +
        "; " +
        ctx.message.from.username +
        "; " +
        ctx.message.author_signature +
        "; " +
        ctx.message.from.id
    )
  );

  bot.command("ranking", async (ctx) => {
    let html = "";
    (await prisma.degree.findMany())
      .sort((a, b) => (a.points < b.points ? 1 : -1))
      .forEach((degree, index) => {
        html = html.concat(
          `${
            index === 0
              ? "\u{1F947}"
              : index === 1
              ? "\u{1F948}"
              : index === 2
              ? "\u{1F949}"
              : "\u{1F19A}"
          } ${degree.name} <code>${degree.points}</code>\n`
        );
      });
    ctx.replyWithHTML("<b>\u{1F3C6} RANKING \u{1F3C6}</b>\n\n".concat(html));
  });

  bot.command("chart", async (ctx) => {
    const degrees = (await prisma.degree.findMany()).sort((a, b) =>
      a.points < b.points ? 1 : -1
    );
    const url = `https://quickchart.io/chart?bkg=transparent&f=png&width=1000&height=600&c={type:'bar',data:{labels:[${degrees.map(
      (degree) => "'" + degree.name + "'"
    )}],datasets:[{label:'Puntos',data:[${degrees.map(
      (degree) => degree.points
    )}]}]}}`;
    logger.info(
      {
        url,
      },
      "Generated graph"
    );
    ctx.replyWithDocument(url);
  });

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

  bot.command("add", async (ctx) => {
    // Check if its admin
    requiresAdmin(ctx, async () => {
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
                  Markup.button.callback(
                    name,
                    `add_${name.toLowerCase()}_${points}_${uuid}`
                  )
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

  bot.action(/add_([\wáéíóú]+)_([0-9]+)_(.+)/, async (ctx) => {
    logger.trace(
      {
        matches: ctx.match,
        degree: ctx.match[1],
        points: ctx.match[2],
        uuid: ctx.match[3],
      },
      "Handling adding points to degree"
    );
    ctx.deleteMessage(
      (
        await prisma.actions.findUnique({
          where: {
            identifier: ctx.match[3],
          },
        })
      ).message_id
    );
    ctx.reply(`¡Puntos añadidos! El grado ${ctx.match[1]} con ${ctx.match[2]}`);
    ctx.answerCbQuery();
  });

  bot.action(/add_cancel_(.+)/, async (ctx) => {
    logger.trace({
      matches: ctx.match,
      uuid: ctx.match[1],
    });
    ctx.deleteMessage(
      (
        await prisma.actions.findUnique({
          where: {
            identifier: ctx.match[1],
          },
        })
      ).message_id
    );
    ctx.reply("¡Los puntos no han sido añadidos!");
    ctx.answerCbQuery();
  });

  // * ADMINISTRADORES

  //* Add admins (must be super-admin)
  bot.command("add_admin", async (ctx) => {
    const username = ctx.message.text.split(" ")[1];
    if (await checkAdmin(ctx))
      ctx.replyWithHTML("<b>COMANDO DE ADMINISTRADOR</b>");
    else {
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
    }
  });

  //* Remove admins (must be super-admin)
  bot.command("remove_admin", async (ctx) => {
    const username = ctx.message.text.split(" ")[1];
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
    if (await checkAdmin(ctx))
      ctx.replyWithHTML("<b>COMANDO DE ADMINISTRADOR</b>");
    else {
      logger.info("Processing /admins");
      ctx.replyWithHTML(
        (await prisma.admin.findMany()).reduce(
          (prev, curr) => (prev += "@" + curr.username + "\n"),
          "<b>ADMINS</b>\n"
        )
      );
    }
  });

  bot.help((ctx) => ctx.reply("Send me a sticker")); // Make different if its admin
  bot.on("sticker", (ctx) => ctx.reply("👍"));
  bot.hears("hi", (ctx) => ctx.reply("Hey there"));
  bot.launch();

  // Enable graceful stop
  process.once("SIGINT", () => {
    logger.info("Gracefully shutting down...");
    bot.stop("SIGINT");
    prisma.$disconnect();
  });
  process.once("SIGTERM", () => {
    logger.info("Gracefully shutting down...");
    bot.stop("SIGTERM");
    prisma.$disconnect();
  });
}
