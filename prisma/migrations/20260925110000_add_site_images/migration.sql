-- CreateTable
CREATE TABLE "SiteImage" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "mime" TEXT NOT NULL,
    "data" BLOB NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "updatedAt" DATETIME NOT NULL
);
