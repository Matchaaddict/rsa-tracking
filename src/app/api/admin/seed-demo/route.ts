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
    "ดำเนินการติดตั้งกล้อง CCTV จำนวน 50 ตัว ครอบคลุมจุดเสี่ยง 12 แห่ง เสร็จสิ้น 100% และส่งมอบให้ผู้ดูแลระบบแล้วเมื่อ ธ.ค. 2569",
    "จัดซื้อเครื่องตรวจวัดระดับแอลกอฮอล์ จำนวน 200 เครื่อง ส่งมอบให้หน่วยปฏิบัติการครบถ้วนแล้ว พร้อมจัดอบรมการใช้งาน 3 รุ่น รวม 150 เจ้าหน้าที่ (ม.ค. 2570)",
    "จัดทำคู่มือมาตรฐานความปลอดภัยทางถนน เผยแพร่ผ่านช่องทางออนไลน์และแจกจ่ายฉบับพิมพ์ครบทุกจังหวัดแล้ว (ก.พ. 2570)",
    "ดำเนินโครงการอบรมพนักงานขับรถโดยสาร 4 รุ่น รวม 800 คน ผ่านการทดสอบครบทุกคน ออกใบรับรองแล้ว (ม.ค. 2570)",
    "ติดตั้ง rumble strips บนถนนสายหลัก 8 เส้นทาง รวม 42 กม. แล้วเสร็จเมื่อ ก.พ. 2570",
    "ปรับปรุงระบบ GPS ในรถโดยสาร 1,200 คัน ทดสอบระบบเรียบร้อย ใช้งานจริงตั้งแต่ ม.ค. 2570",
  ],
  IN_PROGRESS: [
    "อยู่ระหว่างจัดทำแผนของบประมาณปี 2570 เพื่อจัดหาเครื่องมือบังคับใช้กฎหมาย คาดได้รับอนุมัติภายใน มิ.ย. 2570",
    "อยู่ระหว่างออกแบบแผนก่อสร้างจุดพักรถ 5 แห่ง ผ่าน EIA แล้ว คาดเริ่มก่อสร้าง ส.ค. 2570",
    "จัดอบรมพนักงานขับรถรุ่นที่ 1-2 เสร็จแล้ว (320 คน) อยู่ระหว่างเตรียมรุ่นที่ 3 คาดแล้วเสร็จ ก.ค. 2570",
    "ดำเนินการติดตั้งป้ายเตือนและไฟส่องสว่างในจุดก่อสร้าง 3 แห่ง เสร็จแล้ว 2 แห่ง อีก 1 แห่งรอวัสดุ คาดสำเร็จ พ.ค. 2570",
    "อยู่ระหว่างปรับปรุงฐานข้อมูลอุบัติเหตุให้เป็น real-time เชื่อมต่อระบบกลาง คาดแล้วเสร็จ ก.ย. 2570",
    "จัดรณรงค์ผ่าน 3 ช่องทาง ได้แก่ โซเชียลมีเดีย วิทยุชุมชน และป้ายบิลบอร์ด ดำเนินการแล้ว 60% ของแผน คาดครบ 100% ภายใน ส.ค. 2570",
    "อยู่ระหว่างทบทวนกฎหมายร่วมกับสำนักงานกฤษฎีกา คาดส่งร่างได้ภายใน ต.ค. 2570",
  ],
  NOT_RELEVANT: [
    "ภารกิจนี้ไม่อยู่ในขอบเขตของกรม ได้ประสานส่งต่อให้หน่วยงานที่รับผิดชอบโดยตรงแล้ว",
    "ไม่เกี่ยวข้องกับบทบาทและอำนาจหน้าที่ของหน่วยงาน",
  ],
};

// ใช้เป็น progress entry ก่อนหน้า (ก่อนถึงเนื้อหาปัจจุบัน) เพื่อให้ timeline ดูเป็นขั้นเป็นตอน
const PROGRESS_MILESTONES = [
  "เริ่มศึกษาข้อมูล จัดทำ TOR และประสานหน่วยงานที่เกี่ยวข้อง",
  "ลงพื้นที่สำรวจ ประเมินจุดเสี่ยง จัดทำแผนรายละเอียด",
  "เสนอของบประมาณดำเนินงาน อยู่ระหว่างพิจารณาอนุมัติ",
  "ได้รับอนุมัติงบประมาณ อยู่ระหว่างจัดซื้อจัดจ้างตามระเบียบ",
  "เริ่มดำเนินการในพื้นที่นำร่อง ความคืบหน้าเป็นไปตามแผน",
  "ขยายผลไปพื้นที่อื่นและประเมินผลเบื้องต้น",
];

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
  const festival = await prisma.festival.findFirst({
    where: { type: { in: ["NEW_YEAR", "SONGKRAN"] } },
    orderBy: { year: "desc" },
  });
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

        // jitter เล็กน้อยให้ timeline ของแต่ละ agency/proposal ไม่ซ้ำกันเป๊ะๆ
        const jitter = (i * 3 + propIdx * 2) % 6;

        // วาดเส้นเวลาของ entry ตามสถานะ — เก่าสุดอยู่บน
        const entries: { status: string; content: string; daysAgo: number }[] = [];
        if (status === "COMPLETED" && content) {
          entries.push(
            { status: "IN_PROGRESS", content: PROGRESS_MILESTONES[(i + propIdx) % PROGRESS_MILESTONES.length], daysAgo: 150 + jitter },
            { status: "IN_PROGRESS", content: PROGRESS_MILESTONES[(i + propIdx + 2) % PROGRESS_MILESTONES.length], daysAgo: 75 + jitter },
            { status: "COMPLETED", content, daysAgo: 7 + (jitter % 4) }
          );
        } else if (status === "IN_PROGRESS" && content) {
          entries.push(
            { status: "IN_PROGRESS", content: PROGRESS_MILESTONES[(i + propIdx) % PROGRESS_MILESTONES.length], daysAgo: 90 + jitter },
            { status: "IN_PROGRESS", content: PROGRESS_MILESTONES[(i + propIdx + 1) % PROGRESS_MILESTONES.length], daysAgo: 40 + jitter },
            { status: "IN_PROGRESS", content, daysAgo: 10 + (jitter % 5) }
          );
        } else if (status === "NOT_RELEVANT" && content) {
          entries.push({ status: "NOT_RELEVANT", content, daysAgo: 30 + jitter });
        }

        // วันที่ของ Implementation ให้สอดคล้องกับ timeline (เก่าสุด → ล่าสุด)
        const implCreatedDays = entries.length > 0 ? entries[0].daysAgo : 7;
        const implUpdatedDays = entries.length > 0 ? entries[entries.length - 1].daysAgo : 7;

        const impl = await tx.implementation.create({
          data: {
            proposalId: proposal.id,
            agencyId: agency.id,
            status,
            content,
            contactName: `เจ้าหน้าที่ ${mock.name}`,
            contactTitle: "นักวิเคราะห์นโยบายและแผน",
            contactPhone: "02-000-0000",
            createdAt: daysAgo(implCreatedDays),
            updatedAt: daysAgo(implUpdatedDays),
          },
        });

        for (const entry of entries) {
          await tx.progressEntry.create({
            data: {
              implementationId: impl.id,
              status: entry.status,
              content: entry.content,
              createdAt: daysAgo(entry.daysAgo),
              updatedAt: daysAgo(entry.daysAgo),
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
