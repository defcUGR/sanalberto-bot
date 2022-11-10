import dotenv from "dotenv";
import bunyan from "bunyan";

import { SanAlbertoBot } from "./bot";

import baseModule from "./modules/base";
import adminsModule from "./modules/admins";
import dbModule from "./modules/db";
import pointsModule from "./modules/points";
import displayModule from "./modules/display";
import { socketConnectionFn, SocketServer } from "./socket";
import { DataBase } from "./db";
import { handleExit } from "./process";

dotenv.config();

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

const db = new DataBase(logger.child({ component: "db" }));

logger.trace({ env: process.env });

// TODO Make this extend Telegraf and add functions like admin_command
const bot = new SanAlbertoBot(logger.child({ component: "bot" }), db)
  .implementInner(baseModule)
  .implementInner(adminsModule)
  .implementInner(dbModule)
  .implement(pointsModule)
  .implementInner(displayModule);
bot.launch();

logger.info("Bot launched");

const server = new SocketServer(
  logger.child({ component: "socket" }),
  db
).connection(socketConnectionFn);
server.launch(3000);

logger.info("Server launched");

handleExit({
  bot,
  db,
  logger,
  server,
});

// TODO Move database to global here to manage a Express server too and provide a pretty podium, graph, progress & timeline in a web page
// TODO Create wrapper for DB
