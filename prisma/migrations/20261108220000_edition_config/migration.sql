-- Edition settings move to the database: each degree gets its weight (it was
-- hardcoded in src/consts.ts) and admins get their Telegram id.

-- AlterTable
ALTER TABLE "Admin" ADD COLUMN "telegram_id" BIGINT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Degree" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "weight" REAL NOT NULL DEFAULT 1
);
INSERT INTO "new_Degree" ("id", "name", "points") SELECT "id", "name", "points" FROM "Degree";
DROP TABLE "Degree";
ALTER TABLE "new_Degree" RENAME TO "Degree";
CREATE UNIQUE INDEX "Degree_name_key" ON "Degree"("name");
CREATE TABLE "new_Event" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "degree_id" INTEGER NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "points" INTEGER NOT NULL,
    "type" INTEGER NOT NULL,
    "username" TEXT NOT NULL,
    CONSTRAINT "Event_degree_id_fkey" FOREIGN KEY ("degree_id") REFERENCES "Degree" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Event" ("degree_id", "id", "points", "timestamp", "type", "username") SELECT "degree_id", "id", "points", "timestamp", "type", "username" FROM "Event";
DROP TABLE "Event";
ALTER TABLE "new_Event" RENAME TO "Event";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Admin_telegram_id_key" ON "Admin"("telegram_id");


-- Weights of the 2023-2025 editions (<min points> / <degree points>).
UPDATE "Degree" SET "weight" = 1   WHERE "name" = 'Biología';
UPDATE "Degree" SET "weight" = 3.6 WHERE "name" = 'Bioquímica';
UPDATE "Degree" SET "weight" = 3.6 WHERE "name" = 'Biotecnología';
UPDATE "Degree" SET "weight" = 1.8 WHERE "name" = 'CC. Ambientales';
UPDATE "Degree" SET "weight" = 3.6 WHERE "name" = 'Estadística';
UPDATE "Degree" SET "weight" = 1.4 WHERE "name" = 'Física';
UPDATE "Degree" SET "weight" = 3.6 WHERE "name" = 'Geología';
UPDATE "Degree" SET "weight" = 3.6 WHERE "name" = 'Ing. Electrónica';
UPDATE "Degree" SET "weight" = 2.4 WHERE "name" = 'Ing. Química';
UPDATE "Degree" SET "weight" = 2   WHERE "name" = 'Matemáticas';
UPDATE "Degree" SET "weight" = 2   WHERE "name" = 'Óptica';
UPDATE "Degree" SET "weight" = 2   WHERE "name" = 'Química';
