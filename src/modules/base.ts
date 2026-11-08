import type { BotModule } from "../bot";
import { config } from "../config";
import { escapeHtml } from "../telegram";

const PUBLIC_HELP = [
  "/ranking: ranking de las carreras con sus puntuaciones",
  "/chart: gráfica con las puntuaciones de las carreras",
  "/ediciones: ganadores de cada año",
  "/edicion &lt;año&gt;: clasificación final de un año",
];

const ADMIN_HELP = [
  "/add [puntos] [carrera]: añade puntos a una carrera (por ejemplo <code>/add 37 física</code>; lo que falte se elige con botones)",
  "/remove [puntos] [carrera]: quita puntos a una carrera",
  "/deshacer: deshace tu último cambio de puntos",
  "/historial [n]: últimos cambios de puntos (10 por defecto)",
  "/congelar: congela el marcador público (los admins seguís sumando)",
  "/revelar: muestra el marcador real con la revelación en la web",
  "/exportar [año]: clasificación y movimientos en CSV",
  "/pesos: multiplicador de puntos de cada carrera",
  "/peso &lt;carrera&gt; &lt;peso&gt;: cambia el multiplicador de una carrera",
  "/crear_grado &lt;nombre&gt; [peso]: añade una carrera",
  "/add_admin &lt;username&gt;: añade un administrador",
  "/remove_admin &lt;username&gt;: quita un administrador",
  "/admins: lista de administradores",
];

const SUPERADMIN_HELP = [
  "/eliminar_grado &lt;nombre&gt;: borra una carrera y su historial",
  "/nueva_edicion &lt;año&gt;: guarda la edición en curso y empieza otra con todo a 0",
];

const baseModule: BotModule = (bot, { db, logger }) => {
  bot.use(async (ctx, next) => {
    logger.trace(
      { from: ctx.from?.username, text: ctx.text, data: ctx.callbackQuery && "data" in ctx.callbackQuery ? ctx.callbackQuery.data : undefined },
      "update"
    );
    await next();
  });

  bot.start(async (ctx) => {
    const noAdmins = (await db.adminCount()) === 0;
    const isAdmin = !noAdmins && !!(await db.findAdmin(ctx.from));
    await ctx.replyWithHTML(
      `¡Bienvenido!\n\nTe presentamos el bot de Telegram para la gestión de los puntos de la Guerra de Carreras de San Alberto ${(await db.currentEdition()).year}.\n\n` +
        (noAdmins
          ? config.adminToken
            ? "<b>No hay ningún administrador registrado: envíame la clave de administrador para registrarte como tal.</b>"
            : "<b>No hay ningún administrador registrado y no hay clave de administrador configurada (ADMIN_TOKEN).</b>"
          : isAdmin
            ? "Eres administrador: puedes modificar puntuaciones y otros datos, además de consultarlos. Consulta los comandos disponibles con /help."
            : "Puedes escribirme para consultar el ranking y diferentes datos. Consulta los comandos disponibles con /help.")
    );
  });

  // The first admin registers by sending ADMIN_TOKEN. Only while there are no
  // admins; later ones are added with /add_admin.
  if (config.adminToken) {
    bot.hears(config.adminToken, async (ctx) => {
      // Do not leave the key in the chat.
      await ctx.deleteMessage().catch(() => undefined);
      if ((await db.adminCount()) > 0) return;
      const username = ctx.from.username;
      if (!username) {
        await ctx.reply("Necesitas un nombre de usuario de Telegram para ser administrador.");
        return;
      }
      await db.createAdmin(username, "*token*", ctx.from.id);
      await ctx.reply("¡Administrador registrado con éxito! Ya puedes utilizar comandos de administrador.");
    });
  }

  bot.help(async (ctx) => {
    const isAdmin = !!(await db.findAdmin(ctx.from));
    const isSuper = isAdmin && db.isSuperAdmin(ctx.from);
    const sections = [
      (isAdmin ? "<b>COMANDOS PÚBLICOS</b>\n" : "") + PUBLIC_HELP.join("\n"),
      isAdmin ? "<b>COMANDOS DE ADMINISTRADOR</b>\n" + ADMIN_HELP.join("\n") : "",
      isSuper ? "<b>COMANDOS DE SUPERADMINISTRADOR</b>\n" + SUPERADMIN_HELP.join("\n") : "",
    ];
    await ctx.replyWithHTML(sections.filter(Boolean).join("\n\n"));
  });

  bot.hears("<3", (ctx) => ctx.reply(":3"));

  logger.debug({ superAdmins: config.superAdmins.map(escapeHtml) }, "base module ready");
};

export default baseModule;
