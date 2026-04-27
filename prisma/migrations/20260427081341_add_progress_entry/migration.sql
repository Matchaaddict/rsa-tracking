-- CreateTable
CREATE TABLE "ProgressEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "implementationId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "reportedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProgressEntry_implementationId_fkey" FOREIGN KEY ("implementationId") REFERENCES "Implementation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ProgressEntry_implementationId_createdAt_idx" ON "ProgressEntry"("implementationId", "createdAt");

-- Backfill: turn each existing Implementation with non-empty content into the
-- first ProgressEntry, preserving the original timestamp.
INSERT INTO "ProgressEntry" ("id", "implementationId", "content", "status", "createdAt", "updatedAt")
SELECT
    lower(hex(randomblob(12))),
    "id",
    "content",
    "status",
    "updatedAt",
    "updatedAt"
FROM "Implementation"
WHERE "content" IS NOT NULL AND trim("content") != '';
