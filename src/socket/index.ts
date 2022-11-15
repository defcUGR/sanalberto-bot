import { PrismaClient } from "@prisma/client";
import Logger from "bunyan";
import { createServer, Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { DataBase } from "../db";

let update = true;

export class SocketServer {
  private io: Server;
  private server: HttpServer;
  private logger: Logger;
  private db: DataBase;

  constructor(logger: Logger, db: DataBase) {
    this.logger = logger;
    this.db = db;

    this.server = createServer();
    this.io = new Server(this.server, {
      // options
    });
  }

  connection(
    fn: (socket: Socket, logger: Logger, db: DataBase) => void
  ): SocketServer {
    this.io.on("connection", (sock) => fn(sock, this.logger, this.db));
    return this;
  }

  launch(port: number) {
    this.server.listen(3000);
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
  }, 1000);
};
