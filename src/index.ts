import { createBot } from "./bot";
import { DataBase } from "./db";
import { LiveServer } from "./live";
import { logger } from "./logger";

async function main() {
  const db = new DataBase(logger.child({ component: "db" }));
  const live = new LiveServer(db, logger.child({ component: "live" }));
  const bot = createBot({ db, live, logger: logger.child({ component: "bot" }) });

  let stopping = false;
  const shutdown = async (signal: NodeJS.Signals) => {
    if (stopping) return;
    stopping = true;
    logger.info({ signal }, "shutting down");
    try {
      bot.stop(signal);
    } catch {
      // Not running yet.
    }
    await live.stop();
    await db.disconnect();
    process.exit(0);
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);

  await live.start();

  // launch() only settles when the bot stops; a failure (bad token, another
  // instance polling) rejects it, and then the process should restart.
  bot
    .launch({ dropPendingUpdates: false }, () => logger.info("bot launched"))
    .catch((err: unknown) => {
      logger.fatal({ err }, "bot stopped with an error");
      process.exit(1);
    });
}

process.on("unhandledRejection", (err) => logger.error({ err }, "unhandled rejection"));

main().catch((err: unknown) => {
  logger.fatal({ err }, "could not start");
  process.exit(1);
});
