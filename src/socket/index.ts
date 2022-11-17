import { PrismaClient } from "@prisma/client";
import Logger from "bunyan";
import { createServer, Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { default as express, Express } from "express";
import puppeteer from "puppeteer";
import cors from "cors";
import path from "node:path";

import { DataBase } from "../db";

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

    this.app.use(
      express.static(path.join(__dirname + "../../web/dist/assets"))
    );

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

    this.app.get("/*", async (req, res) => {
      this.logger.trace(
        { file: path.join(__dirname, "../../web/dist/index.html") },
        "requesting index"
      );
      res.sendFile(path.join(__dirname, "../../web/dist/index.html"));
    });
  }

  connection(
    fn: (socket: Socket, logger: Logger, db: DataBase) => void
  ): SocketServer {
    this.io.on("connection", (sock) => fn(sock, this.logger, this.db));
    return this;
  }

  launch(port: number) {
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
    socket.emit("update", {
      Matemáticas: Math.random() * 5,
      Física: Math.random() * 5,
      Química: Math.random() * 5,
    });

    socket.emit(
      "data",
      //@ts-ignore
      await db.prisma.degree.findMany()
    );

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
  }, 1000);

  socket.on("processexit", (password: string) => {
    if (password === "nice") process.exit();
  });
};
