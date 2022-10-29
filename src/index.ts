import dotenv from "dotenv";
import bunyan from "bunyan";

import { SanAlbertoBot } from "./bot";

import baseModule from "./modules/base";
import adminsModule from "./modules/admins";
import dbModule from "./modules/db";
import pointsModule from "./modules/points";
import displayModule from "./modules/display";
import { PrismaClient } from "@prisma/client";
import { socketConnectionFn, SocketServer } from "./socket";

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

const db = new PrismaClient();

logger.trace({ env: process.env });

// TODO Make this extend Telegraf and add functions like admin_command
new SanAlbertoBot(logger.child({ component: "bot" }), db)
  .implement(baseModule)
  .implement(adminsModule)
  .implement(dbModule)
  .implement(pointsModule)
  .implement(displayModule)
  .launch();

logger.info("Bot launched");

new SocketServer(logger.child({ component: "socket" }), db)
  .connection(socketConnectionFn)
  .launch(3000);

logger.info("Server launched");

// TODO Move database to global here to manage a Express server too and provide a pretty podium, graph, progress & timeline in a web page
// TODO Create wrapper for DB
