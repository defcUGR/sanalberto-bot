import path from "node:path";
import dotenv from "dotenv";

// Settings from the environment (or .env). Everything that changes between
// editions or deployments lives here, not in the code.

dotenv.config({ quiet: true });

function required(key: string): string {
  const value = process.env[key]?.trim();
  if (!value) throw new Error(`Missing required environment variable ${key}`);
  return value;
}

function port(key: string, fallback: number): number {
  const raw = process.env[key]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > 65535)
    throw new Error(`${key} must be a port number, got "${raw}"`);
  return value;
}

function list(key: string, fallback = ""): string[] {
  return (process.env[key] ?? fallback)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

const root = path.resolve(__dirname, "..");

export const config = {
  botToken: required("BOT_TOKEN"),
  /** Text that makes its sender the first admin while there are none. */
  adminToken: process.env.ADMIN_TOKEN?.trim() || undefined,
  databaseUrl: process.env.DATABASE_URL?.trim() || "file:./data.db",
  /** Port of the web page, the live data socket and /ranking. */
  port: port("SOCKET_PORT", 3000),
  /** Loopback by default: the reverse proxy is the public way in. */
  host: process.env.SOCKET_HOST?.trim() || "127.0.0.1",
  /** Extra origins allowed to open the socket (the web itself is same-origin). */
  corsOrigins: list("SOCKET_CORS_ORIGIN"),
  editionYear: Number(process.env.EDITION_YEAR) || new Date().getFullYear(),
  /** Usernames (lowercase) that can run destructive commands and cannot be removed. */
  superAdmins: list("SUPERADMINS", "comic_ivans,HipyCas").map((u) =>
    u.replace(/^@/, "").toLowerCase()
  ),
  logLevel: (process.env.LOG_LEVEL?.trim() || "info") as
    | "trace"
    | "debug"
    | "info"
    | "warn"
    | "error"
    | "fatal",
  webDist: path.join(root, "web", "dist"),
  emojiDir: path.join(root, "web", "src", "assets", "emojis"),
  fontDir: path.join(root, "assets", "fonts"),
};
