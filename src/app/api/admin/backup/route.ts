import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [
    admins,
    festivals,
    subCommittees,
    agencies,
    agencySubCommittees,
    proposals,
    proposalSubCommittees,
    proposalAgencies,
    tags,
    proposalTags,
    implementations,
    progressEntries,
    implementationLogs,
    siteConfig,
    faqs,
    agencyMessages,
    siteImagesRaw,
  ] = await Promise.all([
    prisma.admin.findMany(),
    prisma.festival.findMany(),
    prisma.subCommittee.findMany(),
    prisma.agency.findMany(),
    prisma.agencySubCommittee.findMany(),
    prisma.proposal.findMany(),
    prisma.proposalSubCommittee.findMany(),
    prisma.proposalAgency.findMany(),
    prisma.tag.findMany(),
    prisma.proposalTag.findMany(),
    prisma.implementation.findMany(),
    prisma.progressEntry.findMany(),
    prisma.implementationLog.findMany(),
    prisma.siteConfig.findMany(),
    prisma.fAQ.findMany(),
    prisma.agencyMessage.findMany(),
    prisma.siteImage.findMany(),
  ]);
  // รูปเก็บเป็นไบต์ — แปลงเป็น base64 เพื่อให้อยู่ใน JSON ได้
  const siteImages = siteImagesRaw.map((i) => ({ ...i, data: Buffer.from(i.data).toString("base64") }));

  const exportedAt = new Date().toISOString();
  const backup = {
    version: 1,
    exportedAt,
    counts: {
      admins: admins.length,
      festivals: festivals.length,
      subCommittees: subCommittees.length,
      agencies: agencies.length,
      agencySubCommittees: agencySubCommittees.length,
      proposals: proposals.length,
      proposalSubCommittees: proposalSubCommittees.length,
      proposalAgencies: proposalAgencies.length,
      tags: tags.length,
      proposalTags: proposalTags.length,
      implementations: implementations.length,
      progressEntries: progressEntries.length,
      implementationLogs: implementationLogs.length,
      siteConfig: siteConfig.length,
      faqs: faqs.length,
      agencyMessages: agencyMessages.length,
      siteImages: siteImages.length,
    },
    tables: {
      admins,
      festivals,
      subCommittees,
      agencies,
      agencySubCommittees,
      proposals,
      proposalSubCommittees,
      proposalAgencies,
      tags,
      proposalTags,
      implementations,
      progressEntries,
      implementationLogs,
      siteConfig,
      faqs,
      agencyMessages,
      siteImages,
    },
  };

  const stamp = exportedAt.replace(/[:.]/g, "-").slice(0, 19);
  const filename = `rsat-backup-${stamp}.json`;

  return new NextResponse(JSON.stringify(backup, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
