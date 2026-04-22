-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Festival" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SubCommittee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT
);

-- CreateTable
CREATE TABLE "Agency" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AgencySubCommittee" (
    "agencyId" TEXT NOT NULL,
    "subCommitteeId" TEXT NOT NULL,

    PRIMARY KEY ("agencyId", "subCommitteeId"),
    CONSTRAINT "AgencySubCommittee_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AgencySubCommittee_subCommitteeId_fkey" FOREIGN KEY ("subCommitteeId") REFERENCES "SubCommittee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Proposal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "festivalId" TEXT NOT NULL,
    "orderNumber" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Proposal_festivalId_fkey" FOREIGN KEY ("festivalId") REFERENCES "Festival" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProposalSubCommittee" (
    "proposalId" TEXT NOT NULL,
    "subCommitteeId" TEXT NOT NULL,

    PRIMARY KEY ("proposalId", "subCommitteeId"),
    CONSTRAINT "ProposalSubCommittee_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProposalSubCommittee_subCommitteeId_fkey" FOREIGN KEY ("subCommitteeId") REFERENCES "SubCommittee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Implementation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "proposalId" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "content" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Implementation_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Implementation_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_username_key" ON "Admin"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Festival_name_key" ON "Festival"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SubCommittee_name_key" ON "SubCommittee"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Agency_username_key" ON "Agency"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Implementation_proposalId_agencyId_key" ON "Implementation"("proposalId", "agencyId");
