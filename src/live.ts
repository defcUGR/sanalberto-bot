import { createServer, type Server as HttpServer } from "node:http";
import express from "express";
import history from "connect-history-api-fallback";
import { Server } from "socket.io";
import { renderRanking } from "./chart";
import { config } from "./config";
import type { DataBase } from "./db";
import type { Degree } from "./generated/prisma/client";
import type { Logger } from "./logger";

// Web page (web/dist), the live data socket and GET /ranking.
//
// Socket events, both sent on connect and then whenever the points change:
//   data        Degree rows ({ id, name, points, weight }) in creation order
//   dataobject  { [degree name]: points }
// One shared loop serves every client; there are no per-client timers.

const POLL_MS = 2000;

function toObject(rows: Degree[]): Record<string, number> {
  return Object.fromEntries(rows.map(({ name, points }) => [name, points]));
}

export class LiveServer {
  private readonly http: HttpServer;
  private readonly io: Server;
  private snapshot = "";
  private timer: NodeJS.Timeout | undefined;
  private refreshing: Promise<void> | undefined;

  constructor(
    private readonly db: DataBase,
    private readonly logger: Logger
  ) {
    const app = express();
    app.disable("x-powered-by");

    // For the container healthcheck: the process answers and the database opens.
    app.get("/health", async (_req, res) => {
      try {
        await db.prisma.degree.count();
        res.set("Cache-Control", "no-store").json({ ok: true });
      } catch {
        res.status(503).json({ ok: false });
      }
    });

    app.get("/ranking", async (_req, res, next) => {
      try {
        const png = await renderRanking(await db.degrees(), logger);
        res.type("png").set("Cache-Control", "no-store").send(png);
      } catch (err) {
        next(err);
      }
    });

    const files = express.static(config.webDist);
    app.use(files);
    app.use(history({ index: "/index.html" }));
    app.use(files);

    this.http = createServer(app);
    this.io = new Server(this.http, {
      // The web is served from this same origin; other origins only if listed.
      cors: config.corsOrigins.length ? { origin: config.corsOrigins } : undefined,
      serveClient: false,
    });

    this.io.on("connection", async (socket) => {
      this.logger.debug({ id: socket.id, address: socket.handshake.address }, "socket connected");
      try {
        const rows = await this.db.degreesById();
        socket.emit("data", rows);
        socket.emit("dataobject", toObject(rows));
      } catch (err) {
        this.logger.error({ err }, "could not send the first data to a socket");
      }
    });
  }

  /** Sends the points to every client if they changed. Safe to call often. */
  refresh(): Promise<void> {
    this.refreshing ??= this.broadcast().finally(() => (this.refreshing = undefined));
    return this.refreshing;
  }

  private async broadcast() {
    try {
      const rows = await this.db.degreesById();
      const snapshot = JSON.stringify(rows);
      if (snapshot === this.snapshot) return;
      this.snapshot = snapshot;
      this.io.emit("data", rows);
      this.io.emit("dataobject", toObject(rows));
    } catch (err) {
      this.logger.error({ err }, "could not broadcast the points");
    }
  }

  start(): Promise<void> {
    // The bot calls refresh() after each change; the poll also catches changes
    // made outside it, and only runs while someone is watching.
    this.timer = setInterval(() => {
      if (this.io.engine.clientsCount > 0) void this.refresh();
    }, POLL_MS);
    this.timer.unref();
    return new Promise((resolve, reject) => {
      this.http.once("error", reject);
      this.http.listen(config.port, config.host, () => {
        this.logger.info({ host: config.host, port: config.port }, "web and socket listening");
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    clearInterval(this.timer);
    await new Promise<void>((resolve) => this.io.close(() => resolve()));
  }
}
