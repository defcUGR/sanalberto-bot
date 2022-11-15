import { PrismaClient } from "@prisma/client";
import { Context } from "telegraf";
import bunyan from "bunyan";
import { DataBase } from "./db";
import { Markup } from "telegraf";
import { POINTS } from "./consts";

export async function checkAdmin(
  ctx: Context,
  prisma: PrismaClient,
  logger: bunyan
) {
  return (
    (await prisma.admin
      .findUnique({
        where: {
          username: ctx.message.from.username,
        },
      })
      .then((result) => {
        logger.trace(
          { result, username: ctx.message.from.username },
          "check admin"
        );
        return result;
      })) === null
  );
} // Simplify admin check routine with error when not an admin, or maybe take a parameter that is a callback to execute in the else

export async function requiresAdmin(
  ctx: Context,
  db: DataBase,
  fn: (ctx?: Context) => Promise<any>
) {
  if (await db.isNotAdmin(ctx))
    ctx.replyWithHTML("<b>COMANDO DE ADMINISTRADOR</b>");
  else await fn();
}

export const createGroupedArray = function (arr, chunkSize) {
  let groups = [];
  for (let i = 0; i < arr.length; i += chunkSize) {
    groups.push(arr.slice(i, i + chunkSize));
  }
  return groups;
};

export function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

export async function pointsButtons(
  ctx: Context,
  type: "add" | "remove",
  uuid: string
) {
  await ctx.reply("Selecciona la cantidad de puntos a añadir", {
    ...Markup.inlineKeyboard([
      ...createGroupedArray(
        POINTS.map((pts) =>
          Markup.button.callback(pts.toString(), `${type}_${pts}_${uuid}`)
        ),
        2
      ),
      [Markup.button.callback("Cancelar", `${type}_cancel_${uuid}`)],
    ]),
  });
}

export function portFromEnv(key: string, reason: string) {
  const value = process.env[key];
  if (value === undefined)
    throw new Error(`Env var ${key} not set and required for ${reason} port`);
  const num = parseInt(value);
  if (isNaN(num))
    throw new Error(
      `Env var ${key} is not a number and must be for ${reason} port`
    );
  return num;
}
