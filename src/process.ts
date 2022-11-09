import Logger from "bunyan";
import { SanAlbertoBot } from "./bot";
import { DataBase } from "./db";
import { SocketServer } from "./socket";

export async function handleExit({
  bot,
  db,
  logger,
  server,
}: {
  bot: SanAlbertoBot;
  db: DataBase;
  logger: Logger;
  server: SocketServer;
}) {
  process.once("SIGINT", () => {
    logger.info("Gracefully shutting down... (SIGINT) [0/3]");
    bot.stop("SIGINT");
    logger.info("Gracefully shutting down... (SIGTERM) [1/3 bot stopped]");
    db.prisma
      .$disconnect()
      .then(() =>
        logger.info("Gracefully shutting down... (SIGTERM) [2/3 db stopped]")
      );
  });

  process.once("SIGTERM", () => {
    logger.info("Gracefully shutting down... (SIGTERM) [0/3]");
    bot.stop("SIGTERM");
    logger.info("Gracefully shutting down... (SIGTERM) [1/3 bot stopped]");
    db.prisma
      .$disconnect()
      .then(() =>
        logger.info("Gracefully shutting down... (SIGTERM) [2/3 db stopped]")
      );
  });
}
