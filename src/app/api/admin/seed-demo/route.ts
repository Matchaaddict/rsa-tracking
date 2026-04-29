import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const MOCK_AGENCIES = [
  { name: "กรมทดสอบ 1", scNums: [1, 2, 3] },
  { name: "กรมทดสอบ 2", scNums: [2, 4, 5] },
  { name: "กรมทดสอบ 3", scNums: [1, 3, 6] },
  { name: "กรมทดสอบ 4", scNums: [4, 7] },
  { name: "กรมทดสอบ 5", scNums: [5, 7, 8] },
];

const CONTENT = {
  COMPLETED: [
    "ดำเนินการติดตั้งกล้อง CCTV จำนวน 50 ตัว ครอบคลุมจุดเสี่ยง 12 แห่ง เสร็จสิ้น 100% และส่งมอบให้ผู้ดูแลระบบแล้วเมื่อ ธ.ค. 2567",
    "จัดซื้อเครื่องตรวจวัดระดับแอลกอฮอล์ จำนวน 200 เครื่อง ส่งมอบให้หน่วยปฏิบัติการครบถ้วนแล้ว พร้อมจัดอบรมการใช้งาน 3 รุ่น รวม 150 เจ้าหน้าที่",
    "จัดทำคู่มือมาตรฐานความปลอดภัยทางถนน เผยแพร่ผ่านช่องทางออนไลน์และแจกจ่ายฉบับพิมพ์ครบทุกจังหวัดแล้ว",
    "ดำเนินโครงการอบรมพนักงานขับรถโดยสาร 4 รุ่น รวม 800 คน ผ่านการทดสอบครบทุกคน ออกใบรับรองแล้ว",
    "ติดตั้ง rumble strips บนถนนสายหลัก 8 เส้นทาง รวม 42 กม. แล้วเสร็จ",
    "ปรับปรุงระบบ GPS ในรถโดยสาร 1,200 คัน ทดสอบระบบเรียบร้อย ใช้งานจริงตั้งแต่ ม.ค. 2568",
  ],
  IN_PROGRESS: [
    "อยู่ระหว่างจัดทำแผนของบประมาณปี 2568 เพื่อจัดหาเครื่องมือบังคับใช้กฎหมาย คาดได้รับอนุมัติภายใน ก.พ. 2568",
    "อยู่ระหว่างออกแบบแผนก่อสร้างจุดพักรถ 5 แห่ง ผ่าน EIA แล้ว คาดเริ่มก่อสร้าง เม.ย. 2568",
    "จัดอบรมพนักงานขับรถรุ่นที่ 1-2 เสร็จแล้ว (320 คน) อยู่ระหว่างเตรียมรุ่นที่ 3 คาดแล้วเสร็จ มี.ค. 2568",
    "ดำเนินการติดตั้งป้ายเตือนและไฟส่องสว่างในจุดก่อสร้าง 3 แห่ง เสร็จแล้ว 2 แห่ง อีก 1 แห่งรอวัสดุ",
    "อยู่ระหว่างปรับปรุงฐานข้อมูลอุบัติเหตุให้เป็น real-time เชื่อมต่อระบบกลาง คาดแล้วเสร็จ เม.ย. 2568",
    "จัดรณรงค์ผ่าน 3 ช่องทาง ได้แก่ โซเชียลมีเดีย วิทยุชุมชน และป้ายบิลบอร์ด ดำเนินการแล้ว 60% ของแผน",
    "อยู่ระหว่างทบทวนกฎหมายร่วมกับสำนักงานกฤษฎีกา คาดส่งร่างได้ภายใน มิ.ย. 2568",
  ],
  NOT_RELEVANT: [
    "ภารกิจนี้ไม่อยู่ในขอบเขตของกรม ได้ประสานส่งต่อให้หน่วยงานที่รับผิดชอบโดยตรงแล้ว",
    "ไม่เกี่ยวข้องกับบทบาทและอำนาจหน้าที่ของหน่วยงาน",
  ],
};

const STATUS_PATTERNS: { status: string; content: string | null }[][] = [
  // กรมทดสอบ 1 — ส่วนใหญ่เสร็จ
  [
    { status: "COMPLETED",    content: CONTENT.COMPLETED[0] },
    { status: "IN_PROGRESS",  content: CONTENT.IN_PROGRESS[0] },
    { status: "COMPLETED",    content: CONTENT.COMPLETED[1] },
    { status: "IN_PROGRESS",  content: CONTENT.IN_PROGRESS[1] },
    { status: "COMPLETED",    content: CONTENT.COMPLETED[2] },
    { status: "COMPLETED",    content: CONTENT.COMPLETED[3] },
  ],
  // กรมทดสอบ 2 — ผสมทุกสถานะ
  [
    { status: "IN_PROGRESS",  content: CONTENT.IN_PROGRESS[2] },
    { status: "NOT_STARTED",  content: null },
    { status: "COMPLETED",    content: CONTENT.COMPLETED[4] },
    { status: "IN_PROGRESS",  content: CONTENT.IN_PROGRESS[3] },
    { status: "NOT_RELEVANT", content: CONTENT.NOT_RELEVANT[0] },
    { status: "NOT_STARTED",  content: null },
  ],
  // กรมทดสอบ 3 — ส่วนใหญ่ยังไม่เริ่ม
  [
    { status: "NOT_STARTED",  content: null },
    { status: "IN_PROGRESS",  content: CONTENT.IN_PROGRESS[4] },
    { status: "NOT_STARTED",  content: null },
    { status: "IN_PROGRESS",  content: CONTENT.IN_PROGRESS[5] },
    { status: "NOT_RELEVANT", content: CONTENT.NOT_RELEVANT[1] },
    { status: "NOT_STARTED",  content: null },
  ],
  // กรมทดสอบ 4 — เสร็จ + กำลังดำเนิน
  [
    { status: "COMPLETED",    content: CONTENT.COMPLETED[5] },
    { status: "COMPLETED",    content: CONTENT.COMPLETED[0] },
    { status: "IN_PROGRESS",  content: CONTENT.IN_PROGRESS[6] },
    { status: "NOT_STARTED",  content: null },
    { status: "NOT_STARTED",  content: null },
    { status: "COMPLETED",    content: CONTENT.COMPLETED[1] },
  ],
  // กรมทดสอบ 5 — มีไม่เกี่ยวข้อง
  [
    { status: "NOT_RELEVANT", content: CONTENT.NOT_RELEVANT[0] },
    { status: "IN_PROGRESS",  content: CONTENT.IN_PROGRESS[0] },
    { status: "COMPLETED",    content: CONTENT.COMPLETED[2] },
    { status: "NOT_STARTED",  content: null },
    { status: "IN_PROGRESS",  content: CONTENT.IN_PROGRESS[1] },
    { status: "NOT_RELEVANT", content: CONTENT.NOT_RELEVANT[1] },
  ],
];

export async function POST() {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const password = await bcrypt.hash("test1234", 10);

  // โหลด sub-committees
  const allSC = await prisma.subCommittee.findMany();
  const scByNum = new Map<number, string>();
  for (const sc of allSC) {
    const m = sc.name.match(/^C(\d+)/);
    if (m) scByNum.set(Number(m[1]), sc.id);
  }

  // วาระล่าสุด
  const festival = await prisma.festival.findFirst({ orderBy: { year: "desc" } });
  if (!festival) return NextResponse.json({ error: "ไม่มีวาระในระบบ" }, { status: 400 });

  const proposals = await prisma.proposal.findMany({
    where: { festivalId: festival.id },
    orderBy: { orderNumber: "asc" },
    include: { subCommittees: { include: { subCommittee: true } } },
  });
  if (proposals.length === 0) return NextResponse.json({ error: "วาระนี้ยังไม่มีข้อเสนอ" }, { status: 400 });

  let agencyCreated = 0;
  let implCreated = 0;
  const skipped: string[] = [];

  const now = Date.now();
  const daysAgo = (n: number) => new Date(now - n * 86400_000);

  for (let i = 0; i < MOCK_AGENCIES.length; i++) {
    const mock = MOCK_AGENCIES[i];
    const existing = await prisma.agency.findFirst({ where: { name: mock.name } });
    if (existing) { skipped.push(mock.name); continue; }

    const scIds = mock.scNums.map((n) => scByNum.get(n)).filter(Boolean) as string[];
    const pattern = STATUS_PATTERNS[i];

    // คัดข้อเสนอที่เกี่ยวข้องกับ agency นี้ก่อน เพื่อให้รู้ทั้งหมดที่จะสร้าง
    const relevantProposals = proposals.filter((p) => {
      const propScNums = p.subCommittees
        .map((s) => { const m = s.subCommittee.name.match(/^C(\d+)/); return m ? Number(m[1]) : null; })
        .filter(Boolean) as number[];
      return propScNums.some((n) => mock.scNums.includes(n));
    });

    // ห่อ transaction: ถ้า impl loop พังกลางทาง agency จะถูก rollback
    const result = await prisma.$transaction(async (tx) => {
      const agency = await tx.agency.create({
        data: {
          name: mock.name,
          username: mock.name.replace(/\s/g, "").toLowerCase(),
          password,
          plainPassword: "test1234",
          isVisible: true,
          subCommittees: { create: scIds.map((id) => ({ subCommitteeId: id })) },
        },
      });

      let count = 0;
      for (let propIdx = 0; propIdx < relevantProposals.length; propIdx++) {
        const proposal = relevantProposals[propIdx];
        const { status, content } = pattern[propIdx % pattern.length];

        const impl = await tx.implementation.create({
          data: {
            proposalId: proposal.id,
            agencyId: agency.id,
            status,
            content,
            contactName: `เจ้าหน้าที่ ${mock.name}`,
            contactTitle: "นักวิเคราะห์นโยบายและแผน",
            contactPhone: "02-000-0000",
          },
        });

        // Seed progressEntries เพื่อให้ history mode ในหน้าสรุปทำงานได้
        // - COMPLETED: 2 entries (อดีต IN_PROGRESS → ปัจจุบัน COMPLETED)
        // - IN_PROGRESS / NOT_RELEVANT: 1 entry
        // - NOT_STARTED: 0 entries (ยังไม่รายงาน)
        if (status === "COMPLETED" && content) {
          await tx.progressEntry.create({
            data: {
              implementationId: impl.id,
              status: "IN_PROGRESS",
              content: "อยู่ระหว่างดำเนินการตามแผน — รายงานเบื้องต้น",
              createdAt: daysAgo(45),
              updatedAt: daysAgo(45),
            },
          });
          await tx.progressEntry.create({
            data: {
              implementationId: impl.id,
              status: "COMPLETED",
              content,
              createdAt: daysAgo(7),
              updatedAt: daysAgo(7),
            },
          });
        } else if ((status === "IN_PROGRESS" || status === "NOT_RELEVANT") && content) {
          await tx.progressEntry.create({
            data: {
              implementationId: impl.id,
              status,
              content,
              createdAt: daysAgo(status === "NOT_RELEVANT" ? 30 : 14),
              updatedAt: daysAgo(status === "NOT_RELEVANT" ? 30 : 14),
            },
          });
        }

        count++;
      }
      return count;
    }, { timeout: 30000 });

    agencyCreated++;
    implCreated += result;
  }

  return NextResponse.json({
    ok: true,
    agencyCreated,
    implCreated,
    skipped,
    festival: festival.name,
  });
}

export async function DELETE() {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const agencies = await prisma.agency.findMany({ where: { name: { startsWith: "กรมทดสอบ" } } });
  const ids = agencies.map((a) => a.id);
  await prisma.agency.deleteMany({ where: { id: { in: ids } } });
  return NextResponse.json({ ok: true, deleted: ids.length });
}
