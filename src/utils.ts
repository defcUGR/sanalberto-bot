import { PrismaClient } from "@prisma/client";
import { Context } from "telegraf";

export async function checkAdmin(ctx: Context, prisma: PrismaClient) {
  return (
    (await prisma.admin.findUnique({
      where: {
        username: ctx.message.from.username,
      },
    })) === null
  );
} // Simplify admin check routine with error when not an admin, or maybe take a parameter that is a callback to execute in the else

export async function requiresAdmin(
  ctx: Context,
  prisma: PrismaClient,
  fn: () => Promise<any>
) {
  if (!checkAdmin(ctx, prisma))
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
