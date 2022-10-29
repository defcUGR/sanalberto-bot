import { Telegraf } from "telegraf";
import bunyan from "bunyan";
import { PrismaClient } from "@prisma/client";

export class SanAlbertoBot {
  private bot: Telegraf;
  private logger: bunyan;
  private prisma: PrismaClient;

  constructor(logger: bunyan, prisma: PrismaClient) {
    if (process.env.BOT_TOKEN === undefined) {
      throw new Error("Provide BOT_TOKEN environment variable to use");
    }
    this.bot = new Telegraf(process.env.BOT_TOKEN);

    this.logger = logger;

    this.prisma = prisma;
  }

  implement(
    fn: (bot: Telegraf, logger: bunyan, db: PrismaClient) => void
  ): SanAlbertoBot {
    fn(this.bot, this.logger, this.prisma);
    return this;
  }

  launch() {
    // Enable graceful stop
    process.once("SIGINT", () => {
      this.logger.info("Gracefully shutting down...");
      this.bot.stop("SIGINT");
      this.prisma.$disconnect();
    });
    process.once("SIGTERM", () => {
      this.logger.info("Gracefully shutting down...");
      this.bot.stop("SIGTERM");
      this.prisma.$disconnect();
    });

    this.bot.launch();
  }
}
