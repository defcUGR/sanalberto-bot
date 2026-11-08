import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import {
  PrismaClient,
  type Admin,
  type Degree,
  type Edition,
  type EditionResult,
} from "./generated/prisma/client";
import { config } from "./config";
import type { Logger } from "./logger";

export type PointsType = "add" | "remove";

/** The Telegram user behind a message or a button press. */
export interface TelegramUser {
  id: number;
  username?: string;
}

export interface PointsResult {
  degree: Degree;
  /** Points after the weight, before the floor at 0. */
  weighted: number;
  /** Points actually added or removed. */
  applied: number;
}

/** A movement as the public web shows it. */
export interface Movement {
  id: number;
  degree: string;
  type: PointsType;
  points: number;
  at: string;
}

export interface Standing {
  position: number;
  degree: string;
  points: number;
}

export interface EditionSummary {
  edition: Edition;
  standings: Standing[];
}

export interface UndoResult {
  degree: Degree;
  type: PointsType;
  points: number;
}

const EVENT_TYPE: Record<PointsType, number> = { remove: 0, add: 1 };

export class DataBase {
  readonly prisma: PrismaClient;

  constructor(
    private readonly logger: Logger,
    url = config.databaseUrl
  ) {
    this.prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });
  }

  // ─── Degrees ─────────────────────────────────────────────────────────────

  /** All degrees, highest score first. */
  degrees(): Promise<Degree[]> {
    return this.prisma.degree.findMany({ orderBy: [{ points: "desc" }, { name: "asc" }] });
  }

  /** All degrees in creation order (what the web expects). */
  degreesById(): Promise<Degree[]> {
    return this.prisma.degree.findMany({ orderBy: { id: "asc" } });
  }

  degreeByName(name: string): Promise<Degree | null> {
    return this.prisma.degree.findUnique({ where: { name } });
  }

  async createDegree(name: string, weight: number, by: string): Promise<Degree> {
    const degree = await this.prisma.degree.create({ data: { name, weight } });
    this.logger.info({ degree, by }, "degree created");
    return degree;
  }

  /** Deletes the degree and its point history. */
  async deleteDegree(name: string, by: string): Promise<Degree> {
    const degree = await this.prisma.degree.delete({ where: { name } });
    this.logger.warn({ degree, by }, "degree deleted");
    return degree;
  }

  async setWeight(name: string, weight: number, by: string): Promise<Degree> {
    const degree = await this.prisma.degree.update({ where: { name }, data: { weight } });
    this.logger.info({ degree, by }, "degree weight changed");
    return degree;
  }

  // ─── Points ──────────────────────────────────────────────────────────────

  /**
   * Adds or removes `base * weight` points (rounded, never below 0) and records
   * the event, in one transaction.
   */
  async applyPoints(
    degreeId: number,
    base: number,
    type: PointsType,
    username: string
  ): Promise<PointsResult> {
    const result = await this.prisma.$transaction(async (tx) => {
      const current = await tx.degree.findUniqueOrThrow({ where: { id: degreeId } });
      const weighted = Math.round(base * current.weight);
      const next =
        type === "add" ? current.points + weighted : Math.max(0, current.points - weighted);
      const applied = Math.abs(next - current.points);
      const degree = await tx.degree.update({
        where: { id: degreeId },
        data: { points: next },
      });
      // Nothing to undo when nothing changed (removing from a degree at 0).
      if (applied > 0) {
        const edition = await tx.edition.findFirstOrThrow({ where: { closed_at: null } });
        await tx.event.create({
          data: {
            degree_id: degreeId,
            edition_id: edition.id,
            points: applied,
            type: EVENT_TYPE[type],
            username,
          },
        });
      }
      return { degree, weighted, applied };
    });
    this.logger.info(
      { degree: result.degree.name, type, base, weighted: result.weighted, applied: result.applied, username },
      "points"
    );
    return result;
  }

  async lastEvents(count: number) {
    const edition = await this.currentEdition();
    return this.prisma.event.findMany({
      where: { edition_id: edition.id },
      orderBy: { id: "desc" },
      take: count,
      include: { Degree: { select: { name: true } } },
    });
  }

  /** Reverts the last points event recorded by `username`. */
  async undoLast(username: string): Promise<UndoResult | null> {
    const result = await this.prisma.$transaction(async (tx) => {
      const edition = await tx.edition.findFirstOrThrow({ where: { closed_at: null } });
      const event = await tx.event.findFirst({
        where: { username, edition_id: edition.id },
        orderBy: { id: "desc" },
        include: { Degree: true },
      });
      if (!event) return null;
      const type: PointsType = event.type === EVENT_TYPE.add ? "add" : "remove";
      const points =
        type === "add"
          ? Math.max(0, event.Degree.points - event.points)
          : event.Degree.points + event.points;
      const degree = await tx.degree.update({
        where: { id: event.degree_id },
        data: { points },
      });
      await tx.event.delete({ where: { id: event.id } });
      return { degree, type, points: event.points };
    });
    if (result)
      this.logger.warn(
        { degree: result.degree.name, type: result.type, points: result.points, username },
        "points event undone"
      );
    return result;
  }

  // ─── Editions ────────────────────────────────────────────────────────────

  /** The open edition. The migrations always leave exactly one. */
  currentEdition(): Promise<Edition> {
    return this.prisma.edition.findFirstOrThrow({ where: { closed_at: null } });
  }

  /** Degree rows the public sees: the snapshot while frozen, live otherwise. */
  async publicDegrees(edition?: Edition): Promise<Degree[]> {
    const current = edition ?? (await this.currentEdition());
    if (current.frozen_at && current.frozen_snapshot)
      return JSON.parse(current.frozen_snapshot) as Degree[];
    return this.degreesById();
  }

  /** Latest movements of the open edition; while frozen, only up to the freeze. */
  async movements(count: number, edition?: Edition): Promise<Movement[]> {
    const current = edition ?? (await this.currentEdition());
    const events = await this.prisma.event.findMany({
      where: {
        edition_id: current.id,
        ...(current.frozen_at ? { timestamp: { lte: current.frozen_at } } : {}),
      },
      orderBy: { id: "desc" },
      take: count,
      include: { Degree: { select: { name: true } } },
    });
    return events.map((e) => ({
      id: e.id,
      degree: e.Degree.name,
      type: e.type === EVENT_TYPE.add ? "add" : "remove",
      points: e.points,
      at: e.timestamp.toISOString(),
    }));
  }

  /** Freezes the public scoreboard; admins keep adding points. */
  async freeze(by: string): Promise<Edition | null> {
    const edition = await this.currentEdition();
    if (edition.frozen_at) return null;
    const snapshot = JSON.stringify(await this.degreesById());
    const frozen = await this.prisma.edition.update({
      where: { id: edition.id },
      data: { frozen_at: new Date(), frozen_snapshot: snapshot },
    });
    this.logger.warn({ year: frozen.year, by }, "scoreboard frozen");
    return frozen;
  }

  /** Shows the real scoreboard again. */
  async unfreeze(by: string): Promise<Edition | null> {
    const edition = await this.currentEdition();
    if (!edition.frozen_at) return null;
    const live = await this.prisma.edition.update({
      where: { id: edition.id },
      data: { frozen_at: null, frozen_snapshot: null },
    });
    this.logger.warn({ year: live.year, by }, "scoreboard revealed");
    return live;
  }

  private static standings(degrees: { name: string; points: number }[]): Standing[] {
    return [...degrees]
      .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name))
      .map((d, i) => ({ position: i + 1, degree: d.name, points: d.points }));
  }

  private static fromResults(results: EditionResult[]): Standing[] {
    return [...results]
      .sort((a, b) => a.position - b.position)
      .map(({ position, degree, points }) => ({ position, degree, points }));
  }

  /**
   * Closes the open edition, keeping its standings and history, and opens
   * `year` with every degree at 0 points.
   */
  async newEdition(year: number, by: string): Promise<{ closed: EditionSummary; opened: Edition }> {
    const result = await this.prisma.$transaction(async (tx) => {
      const current = await tx.edition.findFirstOrThrow({ where: { closed_at: null } });
      const degrees = await tx.degree.findMany();
      const standings = DataBase.standings(degrees);
      await tx.editionResult.createMany({
        data: standings.map((s) => ({ edition_id: current.id, ...s })),
      });
      const closed = await tx.edition.update({
        where: { id: current.id },
        data: { closed_at: new Date(), frozen_at: null, frozen_snapshot: null },
      });
      const opened = await tx.edition.create({ data: { year } });
      await tx.degree.updateMany({ data: { points: 0 } });
      return { closed: { edition: closed, standings }, opened };
    });
    this.logger.warn({ closed: result.closed.edition.year, opened: year, by }, "new edition");
    return result;
  }

  /** Every edition, newest first, with its standings (live for the open one). */
  async editions(): Promise<EditionSummary[]> {
    const editions = await this.prisma.edition.findMany({
      orderBy: { year: "desc" },
      include: { results: true },
    });
    const live = DataBase.standings(await this.degrees());
    return editions.map(({ results, ...edition }) => ({
      edition,
      standings: edition.closed_at ? DataBase.fromResults(results) : live,
    }));
  }

  async edition(year: number): Promise<EditionSummary | null> {
    return (await this.editions()).find((e) => e.edition.year === year) ?? null;
  }

  /** Movements of an edition, oldest first, for the CSV export. */
  editionEvents(editionId: number) {
    return this.prisma.event.findMany({
      where: { edition_id: editionId },
      orderBy: { id: "asc" },
      include: { Degree: { select: { name: true } } },
    });
  }

  // ─── Admins ──────────────────────────────────────────────────────────────

  admins(): Promise<Admin[]> {
    return this.prisma.admin.findMany({ orderBy: { username: "asc" } });
  }

  adminCount(): Promise<number> {
    return this.prisma.admin.count();
  }

  /**
   * The admin behind a Telegram user. Admins are matched by Telegram id; an
   * admin added by username gets its id bound the first time it talks to
   * the bot, so a later change of username keeps it admin and a new owner of
   * the old username does not become one.
   */
  async findAdmin(user: TelegramUser): Promise<Admin | null> {
    const id = BigInt(user.id);
    const byId = await this.prisma.admin.findUnique({ where: { telegram_id: id } });
    if (byId) {
      if (user.username && user.username !== byId.username) {
        await this.prisma.admin
          .update({ where: { id: byId.id }, data: { username: user.username } })
          .catch((err: unknown) =>
            this.logger.warn({ err, admin: byId.username }, "username not updated")
          );
      }
      return byId;
    }
    if (!user.username) return null;
    const wanted = user.username.toLowerCase();
    const pending = (await this.prisma.admin.findMany({ where: { telegram_id: null } })).find(
      (admin) => admin.username.toLowerCase() === wanted
    );
    if (!pending) return null;
    const bound = await this.prisma.admin.update({
      where: { id: pending.id },
      data: { telegram_id: id, username: user.username },
    });
    this.logger.info({ admin: bound.username }, "admin bound to its Telegram id");
    return bound;
  }

  isSuperAdmin(user: TelegramUser): boolean {
    return !!user.username && config.superAdmins.includes(user.username.toLowerCase());
  }

  async adminByUsername(username: string): Promise<Admin | null> {
    const wanted = username.toLowerCase();
    return (await this.admins()).find((admin) => admin.username.toLowerCase() === wanted) ?? null;
  }

  async createAdmin(username: string, addedBy: string, telegramId?: number): Promise<Admin> {
    const admin = await this.prisma.admin.create({
      data: {
        username,
        added_by: addedBy,
        telegram_id: telegramId === undefined ? null : BigInt(telegramId),
      },
    });
    this.logger.info({ admin: admin.username, addedBy }, "admin added");
    return admin;
  }

  async deleteAdmin(id: number, by: string): Promise<Admin> {
    const admin = await this.prisma.admin.delete({ where: { id } });
    this.logger.info({ admin: admin.username, by }, "admin removed");
    return admin;
  }

  disconnect(): Promise<void> {
    return this.prisma.$disconnect();
  }
}
