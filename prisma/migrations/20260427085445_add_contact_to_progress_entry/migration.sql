-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ProgressEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "implementationId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "reportedBy" TEXT,
    "contactName" TEXT NOT NULL DEFAULT '',
    "contactTitle" TEXT NOT NULL DEFAULT '',
    "contactPhone" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProgressEntry_implementationId_fkey" FOREIGN KEY ("implementationId") REFERENCES "Implementation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ProgressEntry" ("content", "createdAt", "id", "implementationId", "reportedBy", "status", "updatedAt", "contactName", "contactTitle", "contactPhone")
SELECT
    pe."content",
    pe."createdAt",
    pe."id",
    pe."implementationId",
    pe."reportedBy",
    pe."status",
    pe."updatedAt",
    COALESCE(i."contactName", ''),
    COALESCE(i."contactTitle", ''),
    COALESCE(i."contactPhone", '')
FROM "ProgressEntry" pe
JOIN "Implementation" i ON i."id" = pe."implementationId";
DROP TABLE "ProgressEntry";
ALTER TABLE "new_ProgressEntry" RENAME TO "ProgressEntry";
CREATE INDEX "ProgressEntry_implementationId_createdAt_idx" ON "ProgressEntry"("implementationId", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
