import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  csvEscape,
  buildDetailCsv,
  buildSummaryCsv,
  buildPendingCsv,
  buildHistoryCsv,
} from "@/lib/csvExport";

const BOM = "﻿";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const type = new URL(req.url).searchParams.get("type") ?? "detail";
  let csv = "";

  if (type === "agencies") {
    const agencies = await prisma.agency.findMany({
      orderBy: { username: "asc" },
      include: { subCommittees: { include: { subCommittee: true } } },
    });
    csv = BOM + "ลำดับ,ชื่อหน่วยงาน,Username,อนุกรรมการที่สังกัด\n";
    agencies.forEach((a, idx) => {
      const scNames = a.subCommittees.map((s) => s.subCommittee.name).join("; ");
      csv += `${idx + 1},${csvEscape(a.name)},${csvEscape(a.username)},${csvEscape(scNames)}\n`;
    });
  } else if (type === "subcommittees") {
    const subs = await prisma.subCommittee.findMany({
      orderBy: { name: "asc" },
      include: { agencies: { include: { agency: { select: { name: true } } } } },
    });
    csv = BOM + "อนุกรรมการ,จำนวนหน่วยงาน,รายชื่อหน่วยงาน\n";
    subs.forEach((s) => {
      const names = s.agencies.map((a) => a.agency.name).join("; ");
      csv += `${csvEscape(s.name)},${s.agencies.length},${csvEscape(names)}\n`;
    });
  } else if (type === "credentials") {
    const agencies = await prisma.agency.findMany({
      orderBy: { username: "asc" },
      select: { name: true, username: true, plainPassword: true, passwordChangedByAgency: true },
    });
    csv = BOM + "ลำดับ,ชื่อหน่วยงาน,Username,Password,สถานะ\n";
    agencies.forEach((a, idx) => {
      const status = a.passwordChangedByAgency
        ? "หน่วยงานเปลี่ยนรหัสเองแล้ว"
        : a.plainPassword
        ? "รหัสเริ่มต้น"
        : "ไม่ทราบรหัส (รอรีเซ็ต)";
      const pw = a.passwordChangedByAgency ? "(หน่วยงานตั้งเอง)" : a.plainPassword || "-";
      csv += `${idx + 1},${csvEscape(a.name)},${csvEscape(a.username)},${csvEscape(pw)},${csvEscape(status)}\n`;
    });
  } else if (type === "summary") {
    const agencies = await prisma.agency.findMany({
      orderBy: { name: "asc" },
      include: {
        subCommittees: { include: { subCommittee: true } },
        implementations: true,
      },
    });
    csv = buildSummaryCsv(agencies);
  } else if (type === "pending") {
    const [proposals, agencies] = await Promise.all([
      prisma.proposal.findMany({
        orderBy: [{ festival: { year: "desc" } }, { orderNumber: "asc" }],
        include: {
          festival: true,
          subCommittees: { include: { subCommittee: true } },
          implementations: { select: { agencyId: true, status: true } },
        },
      }),
      prisma.agency.findMany({
        orderBy: { name: "asc" },
        include: { subCommittees: { include: { subCommittee: true } } },
      }),
    ]);
    csv = buildPendingCsv(proposals, agencies);
  } else if (type === "history") {
    const proposals = await prisma.proposal.findMany({
      orderBy: [{ festival: { year: "desc" } }, { orderNumber: "asc" }],
      include: {
        festival: true,
        implementations: {
          include: {
            agency: { select: { name: true } },
            progressEntries: true,
          },
        },
      },
    });
    csv = buildHistoryCsv(proposals);
  } else {
    const proposals = await prisma.proposal.findMany({
      orderBy: [{ festival: { year: "desc" } }, { orderNumber: "asc" }],
      include: {
        festival: true,
        subCommittees: { include: { subCommittee: true } },
        implementations: { include: { agency: { select: { name: true } } } },
      },
    });
    csv = buildDetailCsv(proposals);
  }

  const date = new Date().toISOString().slice(0, 10);
  const filename = `rsat-${type}-${date}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
