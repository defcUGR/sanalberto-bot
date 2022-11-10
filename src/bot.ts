import { Telegraf } from "telegraf";
import bunyan from "bunyan";
import { DataBase } from "./db";
import { Update } from "telegraf/typings/core/types/typegram";
import { MaybeArray, NarrowedContext } from "telegraf/typings/composer";
import { requiresAdmin } from "./utils";
import Logger from "bunyan";
import { Context } from "telegraf";
import { MountMap } from "telegraf/typings/telegram-types";

export class SanAlbertoBot {
  private bot: Telegraf;
  private logger: bunyan;
  private db: DataBase;

  constructor(logger: bunyan, db: DataBase) {
    if (process.env.BOT_TOKEN === undefined) {
      throw new Error("Provide BOT_TOKEN environment variable to use");
    }
    this.bot = new Telegraf(process.env.BOT_TOKEN);

    this.logger = logger;

    this.db = db;
  }

  implementInner(
    fn: (bot: Telegraf, logger: bunyan, db: DataBase) => void
  ): SanAlbertoBot {
    fn(this.bot, this.logger, this.db);
    return this;
  }

  implement(fn: (bot: CommandParams) => void): SanAlbertoBot {
    fn({ bot: this, telegraf: this.bot, logger: this.logger, db: this.db });
    return this;
  }

  launch() {
    // TODO Move this to general
    // Enable graceful stop
    this.bot.launch();
  }

  adminCommand(key: MaybeArray<string>, fn: (ctx?: Ctx) => Promise<any>) {
    this.bot.command(
      key,
      async (ctx) => await requiresAdmin(ctx, this.db, () => fn(ctx))
    );
  }

  stop(flag: "SIGINT" | "SIGTERM") {
    this.bot.stop(flag);
  }
}

export type CommandParams = {
  bot: SanAlbertoBot;
  telegraf: Telegraf;
  logger: Logger;
  db: DataBase;
};

type Ctx = NarrowedContext<Context<Update>, MountMap["text"]>;
