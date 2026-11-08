// Container entry point: brings the database schema up to date, then starts
// the bot. Plain CommonJS so it runs as is in the distroless image.
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const prismaCli = require.resolve("prisma/build/index.js", { paths: [root] });

function prisma(...args) {
  execFileSync(process.execPath, [prismaCli, ...args], { cwd: root, stdio: "inherit" });
}

// Databases from before 2026 were created with `prisma db push` and have no
// migration history: mark the first migration (the schema they already have)
// as applied so `migrate deploy` only runs the later ones.
const url = process.env.DATABASE_URL || "";
const file = url.startsWith("file:") ? path.resolve(root, url.slice(5)) : null;
if (file && fs.existsSync(file)) {
  const Database = require(require.resolve("better-sqlite3", { paths: [root] }));
  const db = new Database(file, { readonly: true });
  const tables = new Set(
    db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((t) => t.name)
  );
  db.close();
  if (tables.has("Degree") && !tables.has("_prisma_migrations")) {
    console.log("Existing database without migration history: baselining it");
    prisma("migrate", "resolve", "--applied", "20221115160354_init");
  }
}

prisma("migrate", "deploy");
require(path.join(root, "dist", "index.js"));
