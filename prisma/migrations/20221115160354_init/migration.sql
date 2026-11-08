-- CreateTable
CREATE TABLE "Degree" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "Event" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "degree_id" INTEGER NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "points" INTEGER NOT NULL,
    "type" INTEGER NOT NULL,
    "username" TEXT NOT NULL,
    CONSTRAINT "Event_degree_id_fkey" FOREIGN KEY ("degree_id") REFERENCES "Degree" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Admin" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "date_added" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "added_by" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Actions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "message_id" INTEGER NOT NULL,
    "identifier" TEXT NOT NULL,
    "type" TEXT,
    "data" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "Degree_name_key" ON "Degree"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_username_key" ON "Admin"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Actions_message_id_key" ON "Actions"("message_id");

-- CreateIndex
CREATE UNIQUE INDEX "Actions_identifier_key" ON "Actions"("identifier");
