import type { BotModule } from "../bot";
import { commandArgs, escapeHtml, requireAdmin, who } from "../telegram";

const adminsModule: BotModule = (bot, deps) => {
  const { db } = deps;

  bot.command("add_admin", async (ctx) => {
    if (!(await requireAdmin(ctx, deps))) return;
    const username = commandArgs(ctx).split(/\s+/)[0]?.replace(/^@/, "");
    if (!username || !/^\w{4,32}$/.test(username)) {
      await ctx.replyWithHTML(
        "<b>ERROR</b> Tienes que proporcionar un nombre de usuario para añadir como administrador: <code>/add_admin &lt;username&gt;</code>"
      );
      return;
    }
    if (await db.adminByUsername(username)) {
      await ctx.replyWithHTML("<b>ERROR</b> Ese usuario ya es administrador");
      return;
    }
    await db.createAdmin(username, who(ctx));
    await ctx.replyWithHTML(
      `¡Administrador @${escapeHtml(username)} registrado! Será administrador cuando escriba al bot por primera vez.`
    );
  });

  bot.command("remove_admin", async (ctx) => {
    if (!(await requireAdmin(ctx, deps))) return;
    const username = commandArgs(ctx).split(/\s+/)[0]?.replace(/^@/, "");
    if (!username) {
      await ctx.replyWithHTML(
        "<b>ERROR</b> Tienes que proporcionar un nombre de usuario para eliminar como administrador: <code>/remove_admin &lt;username&gt;</code>"
      );
      return;
    }
    const admin = await db.adminByUsername(username);
    if (!admin) {
      await ctx.replyWithHTML("<b>ERROR</b> Ese usuario no es administrador");
      return;
    }
    if (db.isSuperAdmin({ id: 0, username: admin.username })) {
      await ctx.replyWithHTML("<b>ERROR</b> No se puede eliminar a este administrador");
      return;
    }
    await db.deleteAdmin(admin.id, who(ctx));
    await ctx.reply("¡Administrador eliminado!");
  });

  bot.command("admins", async (ctx) => {
    if (!(await requireAdmin(ctx, deps))) return;
    const admins = await db.admins();
    await ctx.replyWithHTML(
      "<b>ADMINS</b>\n" +
        admins
          .map((admin) => `@${escapeHtml(admin.username)}${admin.telegram_id === null ? " (aún no ha escrito al bot)" : ""}`)
          .join("\n")
    );
  });
};

export default adminsModule;
