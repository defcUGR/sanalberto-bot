import { PrismaClient } from "@prisma/client";
import Logger from "bunyan";
import { createServer, Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";

let update = true;

export class SocketServer {
  private io: Server;
  private server: HttpServer;
  private logger: Logger;
  private db: PrismaClient;

  constructor(logger: Logger, prisma: PrismaClient) {
    this.logger = logger;
    this.db = prisma;

    this.server = createServer();
    this.io = new Server(this.server, {
      // options
    });
  }

  connection(
    fn: (socket: Socket, logger: Logger, db: PrismaClient) => void
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
  db: PrismaClient
) => {
  logger.info({ socket }, "client connected to WS");

  socket.on("stop_update", () => (update = false));
  socket.on("start_update", () => (update = true));

  setInterval(() => {
    if (update) {
      console.log("UPDATE");
      socket.emit("update", {
        Matemáticas: Math.random() * 5,
        Física: Math.random() * 5,
        Química: Math.random() * 5,
      });
      console.log("SENVIO");
    } else console.log("NOUPDATE");
  }, 1000);
};
