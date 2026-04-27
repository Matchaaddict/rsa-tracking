-- AlterTable
ALTER TABLE "Implementation" ADD COLUMN "contactName" TEXT;
ALTER TABLE "Implementation" ADD COLUMN "contactPhone" TEXT;
ALTER TABLE "Implementation" ADD COLUMN "contactTitle" TEXT;
ALTER TABLE "Implementation" ADD COLUMN "evidenceUrl" TEXT;

-- CreateTable
CREATE TABLE "ImplementationLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "implementationId" TEXT NOT NULL,
    "oldStatus" TEXT,
    "newStatus" TEXT,
    "oldContent" TEXT,
    "newContent" TEXT,
    "changedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ImplementationLog_implementationId_fkey" FOREIGN KEY ("implementationId") REFERENCES "Implementation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
