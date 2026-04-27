import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const STATUS_TH: Record<string, string> = {
  COMPLETED: "ดำเนินการแล้ว",
  IN_PROGRESS: "กำลังดำเนินการ",
  NOT_STARTED: "ยังไม่เริ่ม",
  NOT_RELEVANT: "ไม่เกี่ยวข้อง",
};
const FESTIVAL_TH: Record<string, string> = {
  NEW_YEAR: "ปีใหม่",
  SONGKRAN: "สงกรานต์",
};

function esc(v: string | null | undefined) {
  if (!v) return "";
  return `"${v.replace(/"/g, '""')}"`;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const type = new URL(req.url).searchParams.get("type") ?? "detail";

  const proposals = await prisma.proposal.findMany({
    orderBy: [{ festival: { year: "desc" } }, { orderNumber: "asc" }],
    include: {
      festival: true,
      subCommittees: { include: { subCommittee: true } },
      implementations: { include: { agency: { select: { name: true } } } },
    },
  });

  let csv = "﻿"; // UTF-8 BOM for Excel

  if (type === "agencies") {
    const agencies = await prisma.agency.findMany({
      orderBy: { username: "asc" },
      include: { subCommittees: { include: { subCommittee: true } } },
    });
    csv += "ลำดับ,ชื่อหน่วยงาน,Username,อนุกรรมการที่สังกัด\n";
    agencies.forEach((a, idx) => {
      const scNames = a.subCommittees.map(s => s.subCommittee.name).join("; ");
      csv += `${idx + 1},${esc(a.name)},${esc(a.username)},${esc(scNames)}\n`;
    });
  } else if (type === "subcommittees") {
    const subs = await prisma.subCommittee.findMany({
      orderBy: { name: "asc" },
      include: { agencies: { include: { agency: { select: { name: true } } } } },
    });
    csv += "อนุกรรมการ,จำนวนหน่วยงาน,รายชื่อหน่วยงาน\n";
    subs.forEach((s) => {
      const names = s.agencies.map(a => a.agency.name).join("; ");
      csv += `${esc(s.name)},${s.agencies.length},${esc(names)}\n`;
    });
  } else if (type === "credentials") {
    const agencies = await prisma.agency.findMany({
      orderBy: { username: "asc" },
      select: { name: true, username: true, plainPassword: true, passwordChangedByAgency: true },
    });
    csv += "ลำดับ,ชื่อหน่วยงาน,Username,Password,สถานะ\n";
    agencies.forEach((a, idx) => {
      const status = a.passwordChangedByAgency
        ? "หน่วยงานเปลี่ยนรหัสเองแล้ว"
        : a.plainPassword
        ? "รหัสเริ่มต้น"
        : "ไม่ทราบรหัส (รอรีเซ็ต)";
      const pw = a.passwordChangedByAgency ? "(หน่วยงานตั้งเอง)" : (a.plainPassword || "-");
      csv += `${idx + 1},${esc(a.name)},${esc(a.username)},${esc(pw)},${esc(status)}\n`;
    });
  } else if (type === "summary") {
    // Per-agency summary
    const agencies = await prisma.agency.findMany({
      orderBy: { name: "asc" },
      include: {
        subCommittees: { include: { subCommittee: true } },
        implementations: true,
      },
    });

    csv += "หน่วยงาน,อนุกรรมการ,ดำเนินการแล้ว,กำลังดำเนินการ,ยังไม่เริ่ม,ไม่เกี่ยวข้อง,รวม,%ความคืบหน้า\n";
    for (const a of agencies) {
      const scNames = a.subCommittees.map(s => s.subCommittee.name).join("; ");
      const done = a.implementations.filter(i => i.status === "COMPLETED").length;
      const prog = a.implementations.filter(i => i.status === "IN_PROGRESS").length;
      const none = a.implementations.filter(i => i.status === "NOT_STARTED").length;
      const nr = a.implementations.filter(i => i.status === "NOT_RELEVANT").length;
      const total = done + prog + none;
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;
      csv += `${esc(a.name)},${esc(scNames)},${done},${prog},${none},${nr},${total},${pct}%\n`;
    }
  } else {
    // Detail: one row per implementation
    csv += "เทศกาล,ปี,อนุกรรมการ,ข้อที่,ชื่อข้อเสนอ,หน่วยงาน,สถานะ,รายละเอียดผลการดำเนินงาน\n";
    for (const p of proposals) {
      const festival = `${FESTIVAL_TH[p.festival.type] ?? p.festival.type}`;
      const year = String(p.festival.year);
      const scs = p.subCommittees.map(s => s.subCommittee.name).join("; ");
      if (p.implementations.length === 0) {
        csv += `${esc(festival)},${year},${esc(scs)},${p.orderNumber},${esc(p.title)},(ยังไม่มีหน่วยงาน),,\n`;
      } else {
        for (const impl of p.implementations) {
          csv += `${esc(festival)},${year},${esc(scs)},${p.orderNumber},${esc(p.title)},${esc(impl.agency.name)},${esc(STATUS_TH[impl.status])},${esc(impl.content)}\n`;
        }
      }
    }
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
