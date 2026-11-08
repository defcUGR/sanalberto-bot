import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient, type Admin, type Degree } from "./generated/prisma/client";
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
      if (applied > 0)
        await tx.event.create({
          data: { degree_id: degreeId, points: applied, type: EVENT_TYPE[type], username },
        });
      return { degree, weighted, applied };
    });
    this.logger.info(
      { degree: result.degree.name, type, base, weighted: result.weighted, applied: result.applied, username },
      "points"
    );
    return result;
  }

  lastEvents(count: number) {
    return this.prisma.event.findMany({
      orderBy: { id: "desc" },
      take: count,
      include: { Degree: { select: { name: true } } },
    });
  }

  /** Reverts the last points event recorded by `username`. */
  async undoLast(username: string): Promise<UndoResult | null> {
    const result = await this.prisma.$transaction(async (tx) => {
      const event = await tx.event.findFirst({
        where: { username },
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

  /** New edition: every degree back to 0 and the history cleared. */
  async resetPoints(by: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.event.deleteMany(),
      this.prisma.degree.updateMany({ data: { points: 0 } }),
    ]);
    this.logger.warn({ by }, "points reset");
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
