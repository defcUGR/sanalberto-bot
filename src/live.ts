import { createServer, type Server as HttpServer } from "node:http";
import express from "express";
import history from "connect-history-api-fallback";
import { Server } from "socket.io";
import { renderRanking } from "./chart";
import { config } from "./config";
import type { DataBase, Movement } from "./db";
import type { Degree } from "./generated/prisma/client";
import type { Logger } from "./logger";

// Web page (web/dist), the live data socket, GET /ranking and GET /health.
//
// Socket events, each sent on connect and then whenever it changes:
//   state       { year, frozen }
//   data        Degree rows ({ id, name, points, weight }) in creation order
//   dataobject  { [degree name]: points }
//   movements   last MOVEMENTS movements, newest first (see Movement)
// and `reveal` (no payload) right before the real scoreboard replaces a
// frozen one. While frozen, data/dataobject are the snapshot taken when it
// froze and movements stop at that moment. One shared loop serves every
// client; there are no per-client timers.

const POLL_MS = 2000;
const MOVEMENTS = 15;

interface PublicView {
  state: { year: number; frozen: boolean };
  data: Degree[];
  dataobject: Record<string, number>;
  movements: Movement[];
}

type Channel = keyof PublicView;
const CHANNELS: Channel[] = ["state", "data", "dataobject", "movements"];

export class LiveServer {
  private readonly http: HttpServer;
  private readonly io: Server;
  private readonly sent = new Map<Channel, string>();
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

    // What the public sees, so a frozen scoreboard stays frozen here too.
    app.get("/ranking", async (_req, res, next) => {
      try {
        const edition = await db.currentEdition();
        const png = await renderRanking(await db.publicDegrees(edition), edition.year, logger);
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
        const view = await this.view();
        for (const channel of CHANNELS) socket.emit(channel, view[channel]);
      } catch (err) {
        this.logger.error({ err }, "could not send the first data to a socket");
      }
    });
  }

  private async view(): Promise<PublicView> {
    const edition = await this.db.currentEdition();
    const data = await this.db.publicDegrees(edition);
    return {
      state: { year: edition.year, frozen: !!edition.frozen_at },
      data,
      dataobject: Object.fromEntries(data.map(({ name, points }) => [name, points])),
      movements: await this.db.movements(MOVEMENTS, edition),
    };
  }

  /** Sends to every client whatever changed. Safe to call often. */
  refresh(): Promise<void> {
    this.refreshing ??= this.broadcast().finally(() => (this.refreshing = undefined));
    return this.refreshing;
  }

  /** Tells the web to play the reveal, then sends the real scoreboard. */
  async reveal(): Promise<void> {
    this.io.emit("reveal");
    await this.refresh();
  }

  private async broadcast() {
    try {
      const view = await this.view();
      for (const channel of CHANNELS) {
        const json = JSON.stringify(view[channel]);
        if (this.sent.get(channel) === json) continue;
        this.sent.set(channel, json);
        this.io.emit(channel, view[channel]);
      }
    } catch (err) {
      this.logger.error({ err }, "could not broadcast the scoreboard");
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
