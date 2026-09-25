-- AlterTable
ALTER TABLE "Proposal" ADD COLUMN "dueDate" DATETIME;

-- CreateTable
CREATE TABLE "ProposalAgency" (
    "proposalId" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,

    PRIMARY KEY ("proposalId", "agencyId"),
    CONSTRAINT "ProposalAgency_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProposalAgency_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Admin" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
    "permissions" TEXT NOT NULL DEFAULT '[]',
    "subCommitteeId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Admin_subCommitteeId_fkey" FOREIGN KEY ("subCommitteeId") REFERENCES "SubCommittee" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Admin" ("createdAt", "id", "isSuperAdmin", "password", "permissions", "username") SELECT "createdAt", "id", "isSuperAdmin", "password", "permissions", "username" FROM "Admin";
DROP TABLE "Admin";
ALTER TABLE "new_Admin" RENAME TO "Admin";
CREATE UNIQUE INDEX "Admin_username_key" ON "Admin"("username");
CREATE TABLE "new_Festival" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "subCommitteeId" TEXT,
    "meetingNo" TEXT,
    "date" DATETIME,
    "docUrl" TEXT,
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Festival_subCommitteeId_fkey" FOREIGN KEY ("subCommitteeId") REFERENCES "SubCommittee" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Festival" ("createdAt", "id", "name", "type", "year") SELECT "createdAt", "id", "name", "type", "year" FROM "Festival";
DROP TABLE "Festival";
ALTER TABLE "new_Festival" RENAME TO "Festival";
CREATE UNIQUE INDEX "Festival_name_key" ON "Festival"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
