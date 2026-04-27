-- Add direction so AgencyMessage can carry both agency→admin questions
-- and admin→agency announcements; add readByAgency for unread tracking
-- on the agency side mirror of readByAdmin.
ALTER TABLE "AgencyMessage" ADD COLUMN "direction" TEXT NOT NULL DEFAULT 'TO_ADMIN';
ALTER TABLE "AgencyMessage" ADD COLUMN "readByAgency" BOOLEAN NOT NULL DEFAULT false;
