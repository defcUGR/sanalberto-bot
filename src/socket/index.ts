import { PrismaClient } from "@prisma/client";
import Logger from "bunyan";
import { createServer, Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { default as express, Express } from "express";
import puppeteer from "puppeteer";
import cors from "cors";
import path from "node:path";
import history from "connect-history-api-fallback";

import { DataBase } from "../db";
import { setInterval } from "timers";

let update = true;

export class SocketServer {
  private app: Express;
  private io: Server;
  private server: HttpServer;
  private logger: Logger;
  private db: DataBase;

  constructor(logger: Logger, db: DataBase) {
    this.logger = logger;
    this.db = db;

    this.app = express();
    this.app.use(cors());
    this.server = createServer(this.app);
    this.io = new Server(this.server, {
      cors: {
        origin: "*",
      },
    });

    const middleware = express.static(path.join(__dirname, "../../web/dist"));

    this.app.use(middleware);

    this.app.use(
      history({
        index: "/index.html",
      })
    );

    this.app.use(middleware);

    this.app.get("/ranking", async (req, res) => {
      const browser = await puppeteer.launch();
      const page = await browser.newPage();
      // page.goto("https://defc.wupp.dev/");
      page.goto("http://localhost:5173");
      const watchDog = page.waitForFunction('window.status === "ready"');
      await watchDog;
      const data = await page.evaluate(() => {
        //@ts-ignore
        return document.querySelector("#rankingCanvas").toDataURL();
      });
      const buffer = Buffer.from(
        data.replace(/^data:image\/\w+;base64,/, ""),
        "base64"
      );
      res.writeHead(200, {
        "Content-Type": "image/png",
        "Content-Length": buffer.length,
      });

      res.end(buffer);
    });
  }

  connection(
    fn: (socket: Socket, logger: Logger, db: DataBase) => void
  ): SocketServer {
    this.io.on("connection", (sock) => fn(sock, this.logger, this.db));
    return this;
  }

  launch(port: number) {
    this.logger.info({ port }, "Socket launched");
    this.server.listen(port);
  }
}

export const socketConnectionFn = (
  socket: Socket,
  logger: Logger,
  db: DataBase
) => {
  logger.info({ socket }, "client connected to WS");

  socket.on("stop_update", () => (update = false));
  socket.on("start_update", () => (update = true));

  setInterval(async () => {
    socket.emit(
      "data",
      //@ts-ignore
      await db.prisma.degree.findMany()
    );
  }, 500);

  setInterval(async () => {
    socket.emit(
      "dataobject",
      Object.fromEntries(
        (
          await db.prisma.degree.findMany({
            select: { name: true, points: true },
          })
        ).map(({ name, points }) => [name, points])
      )
    );
  }, 1500);

  socket.on("processexit", (password: string) => {
    if (password === "nice") process.exit();
  });
};
