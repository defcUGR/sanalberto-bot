-- Editions: one per year. The points in Degree become the open edition (the
-- current year), and every existing movement belongs to it. Older years can
-- be archived as closed editions with their final standings.

-- CreateTable
CREATE TABLE "Edition" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "year" INTEGER NOT NULL,
    "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" DATETIME,
    "frozen_at" DATETIME,
    "frozen_snapshot" TEXT
);

INSERT INTO "Edition" ("year") VALUES (CAST(strftime('%Y', 'now') AS INTEGER));

-- CreateTable
CREATE TABLE "EditionResult" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "edition_id" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "degree" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    CONSTRAINT "EditionResult_edition_id_fkey" FOREIGN KEY ("edition_id") REFERENCES "Edition" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Event" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "degree_id" INTEGER NOT NULL,
    "edition_id" INTEGER NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "points" INTEGER NOT NULL,
    "type" INTEGER NOT NULL,
    "username" TEXT NOT NULL,
    CONSTRAINT "Event_degree_id_fkey" FOREIGN KEY ("degree_id") REFERENCES "Degree" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Event_edition_id_fkey" FOREIGN KEY ("edition_id") REFERENCES "Edition" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Event" ("degree_id", "edition_id", "id", "points", "timestamp", "type", "username") SELECT "degree_id", (SELECT "id" FROM "Edition" LIMIT 1), "id", "points", "timestamp", "type", "username" FROM "Event";
DROP TABLE "Event";
ALTER TABLE "new_Event" RENAME TO "Event";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Edition_year_key" ON "Edition"("year");

-- CreateIndex
CREATE UNIQUE INDEX "EditionResult_edition_id_degree_key" ON "EditionResult"("edition_id", "degree");

