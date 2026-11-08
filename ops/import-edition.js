// Archives an old edition from the database file it used (one file per year
// before 2026): its final points per degree become a closed edition.
//
//   node ops/import-edition.js <year> <old-database.db>
//
// In the container: docker exec sanalberto-bot /nodejs/bin/node ops/import-edition.js 2023 /data/data2023.db
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const Database = require(require.resolve("better-sqlite3", { paths: [root] }));

const [yearArg, source] = process.argv.slice(2);
const year = Number(yearArg);
if (!Number.isInteger(year) || !source) {
  console.error("Usage: node ops/import-edition.js <year> <old-database.db>");
  process.exit(1);
}

const url = process.env.DATABASE_URL || "file:./data.db";
const target = path.resolve(root, url.replace(/^file:/, ""));

const old = new Database(source, { readonly: true });
const degrees = old.prepare('SELECT "name", "points" FROM "Degree"').all();
old.close();
degrees.sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));

const db = new Database(target);
const exists = db.prepare('SELECT "id", "closed_at" FROM "Edition" WHERE "year" = ?').get(year);
if (exists) {
  console.error(`Edition ${year} already exists (${exists.closed_at ? "closed" : "open"})`);
  process.exit(1);
}

// The last write to the old file is when that edition ended.
const closedAt = fs.statSync(source).mtime.toISOString();
db.transaction(() => {
  const { lastInsertRowid } = db
    .prepare('INSERT INTO "Edition" ("year", "started_at", "closed_at") VALUES (?, ?, ?)')
    .run(year, closedAt, closedAt);
  const insert = db.prepare(
    'INSERT INTO "EditionResult" ("edition_id", "position", "degree", "points") VALUES (?, ?, ?, ?)'
  );
  degrees.forEach((d, i) => insert.run(lastInsertRowid, i + 1, d.name, d.points));
})();
db.close();

console.log(`Edition ${year} archived: ${degrees.map((d) => `${d.name} ${d.points}`).join(", ")}`);
