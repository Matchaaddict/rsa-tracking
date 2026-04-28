/**
 * Mock agencies + implementations for demo purposes
 * Run: railway run npx tsx scripts/seed-mock-agencies.ts
 * Safe to re-run — skips agencies that already exist
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import bcrypt from "bcryptjs";

const url = process.env.DATABASE_URL ?? "file:./dev.db";
const prisma = new PrismaClient({ adapter: new PrismaLibSql({ url }) });

// 5 หน่วยงานทดสอบ — กระจายอนุฯ ต่างกัน
const MOCK_AGENCIES = [
  { name: "กรมทดสอบ 1", scNums: [1, 2, 3] },
  { name: "กรมทดสอบ 2", scNums: [2, 4, 5] },
  { name: "กรมทดสอบ 3", scNums: [1, 3, 6] },
  { name: "กรมทดสอบ 4", scNums: [4, 7] },
  { name: "กรมทดสอบ 5", scNums: [5, 7, 8] },
];

// เนื้อหาตัวอย่าง จัดกลุ่มตามสถานะ
const CONTENT = {
  COMPLETED: [
    "ดำเนินการติดตั้งกล้อง CCTV จำนวน 50 ตัว ครอบคลุมจุดเสี่ยง 12 แห่ง ในพื้นที่รับผิดชอบ เสร็จสิ้น 100% และส่งมอบให้ผู้ดูแลระบบแล้วเมื่อ ธ.ค. 2567",
    "จัดซื้อเครื่องตรวจวัดระดับแอลกอฮอล์ จำนวน 200 เครื่อง ส่งมอบให้หน่วยปฏิบัติการครบถ้วนแล้ว พร้อมจัดอบรมการใช้งาน 3 รุ่น รวม 150 เจ้าหน้าที่",
    "จัดทำคู่มือมาตรฐานความปลอดภัยทางถนนสำหรับหน่วยงานในสังกัด เผยแพร่ผ่านช่องทางออนไลน์และแจกจ่ายฉบับพิมพ์ครบทุกจังหวัด",
    "ดำเนินโครงการอบรมพนักงานขับรถโดยสารสาธารณะ 4 รุ่น รวม 800 คน ผ่านการทดสอบครบทุกคน ออกใบรับรองแล้ว",
    "ติดตั้ง rumble strips บนถนนสายหลัก 8 เส้นทาง รวมระยะทาง 42 กม. ดำเนินการแล้วเสร็จทั้งหมด",
    "ปรับปรุงระบบ GPS ในรถโดยสารสาธารณะ จำนวน 1,200 คัน ในสังกัด ทดสอบระบบเรียบร้อยแล้ว ใช้งานจริงตั้งแต่ ม.ค. 2568",
  ],
  IN_PROGRESS: [
    "อยู่ระหว่างดำเนินการจัดทำแผนของบประมาณปี 2568 เพื่อจัดหาเครื่องมือบังคับใช้กฎหมาย คาดว่าจะได้รับอนุมัติภายใน ก.พ. 2568",
    "อยู่ระหว่างออกแบบและจัดทำแผนก่อสร้างจุดพักรถ 5 แห่ง ตามแนวถนนสายหลัก ผ่าน EIA แล้ว คาดเริ่มก่อสร้างได้ เม.ย. 2568",
    "จัดอบรมพนักงานขับรถรุ่นที่ 1-2 เสร็จสิ้นแล้ว (รวม 320 คน) อยู่ระหว่างเตรียมรุ่นที่ 3 คาดแล้วเสร็จภายใน มี.ค. 2568",
    "ดำเนินการติดตั้งป้ายเตือนและไฟส่องสว่างในจุดก่อสร้าง 3 แห่ง เสร็จแล้ว 2 แห่ง อีก 1 แห่งอยู่ระหว่างรอวัสดุ",
    "อยู่ระหว่างปรับปรุงฐานข้อมูลอุบัติเหตุให้เป็น real-time เชื่อมต่อกับระบบกลาง คาดแล้วเสร็จ เม.ย. 2568",
    "จัดรณรงค์ประชาสัมพันธ์ผ่าน 3 ช่องทาง ได้แก่ โซเชียลมีเดีย วิทยุชุมชน และป้ายบิลบอร์ด ดำเนินการแล้ว 60% ของแผน",
    "อยู่ระหว่างทบทวนกฎหมายและระเบียบที่เกี่ยวข้อง ร่วมกับสำนักงานกฤษฎีกา คาดส่งร่างได้ภายใน มิ.ย. 2568",
  ],
  NOT_STARTED: [
    null,
    null,
    null,
  ],
  NOT_RELEVANT: [
    "ภารกิจนี้ไม่อยู่ในขอบเขตของกรม ได้ประสานส่งต่อให้หน่วยงานที่รับผิดชอบโดยตรงแล้ว",
    "ไม่เกี่ยวข้องกับบทบาทและอำนาจหน้าที่ของหน่วยงาน",
  ],
};

// pattern การกระจายสถานะต่อหน่วยงาน (ดัชนีที่ใช้หมุนเวียน)
const STATUS_PATTERNS: Record<string, { status: string; contentPool: (string | null)[] }[]> = {
  "กรมทดสอบ 1": [
    { status: "COMPLETED",   contentPool: CONTENT.COMPLETED },
    { status: "IN_PROGRESS", contentPool: CONTENT.IN_PROGRESS },
    { status: "COMPLETED",   contentPool: CONTENT.COMPLETED },
    { status: "IN_PROGRESS", contentPool: CONTENT.IN_PROGRESS },
    { status: "COMPLETED",   contentPool: CONTENT.COMPLETED },
  ],
  "กรมทดสอบ 2": [
    { status: "IN_PROGRESS", contentPool: CONTENT.IN_PROGRESS },
    { status: "NOT_STARTED", contentPool: CONTENT.NOT_STARTED },
    { status: "COMPLETED",   contentPool: CONTENT.COMPLETED },
    { status: "IN_PROGRESS", contentPool: CONTENT.IN_PROGRESS },
    { status: "NOT_RELEVANT",contentPool: CONTENT.NOT_RELEVANT },
  ],
  "กรมทดสอบ 3": [
    { status: "NOT_STARTED", contentPool: CONTENT.NOT_STARTED },
    { status: "IN_PROGRESS", contentPool: CONTENT.IN_PROGRESS },
    { status: "NOT_STARTED", contentPool: CONTENT.NOT_STARTED },
    { status: "IN_PROGRESS", contentPool: CONTENT.IN_PROGRESS },
    { status: "NOT_RELEVANT",contentPool: CONTENT.NOT_RELEVANT },
  ],
  "กรมทดสอบ 4": [
    { status: "COMPLETED",   contentPool: CONTENT.COMPLETED },
    { status: "COMPLETED",   contentPool: CONTENT.COMPLETED },
    { status: "IN_PROGRESS", contentPool: CONTENT.IN_PROGRESS },
    { status: "NOT_STARTED", contentPool: CONTENT.NOT_STARTED },
    { status: "NOT_STARTED", contentPool: CONTENT.NOT_STARTED },
  ],
  "กรมทดสอบ 5": [
    { status: "NOT_RELEVANT",contentPool: CONTENT.NOT_RELEVANT },
    { status: "IN_PROGRESS", contentPool: CONTENT.IN_PROGRESS },
    { status: "COMPLETED",   contentPool: CONTENT.COMPLETED },
    { status: "NOT_STARTED", contentPool: CONTENT.NOT_STARTED },
    { status: "IN_PROGRESS", contentPool: CONTENT.IN_PROGRESS },
  ],
};

function pick<T>(arr: T[], idx: number): T {
  return arr[idx % arr.length];
}

async function main() {
  const password = await bcrypt.hash("test1234", 10);

  // โหลด sub-committees
  const allSC = await prisma.subCommittee.findMany();
  const scById = new Map(allSC.map((s) => [s.id, s]));
  const scByNum = new Map<number, string>();
  for (const sc of allSC) {
    const m = sc.name.match(/^C(\d+)/);
    if (m) scByNum.set(Number(m[1]), sc.id);
  }

  // โหลดวาระล่าสุด
  const festival = await prisma.festival.findFirst({ orderBy: { year: "desc" } });
  if (!festival) {
    console.error("❌ ไม่มีวาระในระบบ — เพิ่มวาระก่อนแล้วค่อย seed");
    return;
  }
  console.log(`✓ ใช้วาระ: ${festival.name}`);

  // โหลด proposals ทั้งหมดในวาระ
  const proposals = await prisma.proposal.findMany({
    where: { festivalId: festival.id },
    orderBy: { orderNumber: "asc" },
    include: { subCommittees: { include: { subCommittee: true } } },
  });
  if (proposals.length === 0) {
    console.error("❌ วาระนี้ยังไม่มีข้อเสนอ — import ข้อเสนอก่อน");
    return;
  }
  console.log(`✓ พบ ${proposals.length} ข้อเสนอ`);

  let agencyCreated = 0;
  let implCreated = 0;

  for (const mock of MOCK_AGENCIES) {
    // สร้าง/ข้าม agency
    const username = mock.name.replace(/\s/g, "").toLowerCase();
    let agency = await prisma.agency.findFirst({ where: { name: mock.name } });
    if (!agency) {
      const scIds = mock.scNums.map((n) => scByNum.get(n)).filter(Boolean) as string[];
      agency = await prisma.agency.create({
        data: {
          name: mock.name,
          username,
          password,
          plainPassword: "test1234",
          isVisible: true,
          subCommittees: { create: scIds.map((id) => ({ subCommitteeId: id })) },
        },
      });
      agencyCreated++;
      console.log(`  + สร้าง ${mock.name} (อนุฯ ${mock.scNums.join(",")})`);
    } else {
      console.log(`  ~ ${mock.name} มีอยู่แล้ว — ข้าม`);
      continue;
    }

    const pattern = STATUS_PATTERNS[mock.name] ?? STATUS_PATTERNS["กรมทดสอบ 1"];

    // สร้าง implementation สำหรับทุก proposal ที่ SC ของ agency เกี่ยวข้อง
    let propIdx = 0;
    for (const proposal of proposals) {
      const proposalScNums = proposal.subCommittees
        .map((s) => {
          const m = s.subCommittee.name.match(/^C(\d+)/);
          return m ? Number(m[1]) : null;
        })
        .filter(Boolean) as number[];

      const relevant = proposalScNums.some((n) => mock.scNums.includes(n));
      if (!relevant) continue;

      const { status, contentPool } = pick(pattern, propIdx);
      const content = pick(contentPool, propIdx) ?? null;
      propIdx++;

      // ตรวจว่ามี impl แล้วหรือยัง
      const exists = await prisma.implementation.findFirst({
        where: { proposalId: proposal.id, agencyId: agency!.id },
      });
      if (exists) continue;

      await prisma.implementation.create({
        data: {
          proposalId: proposal.id,
          agencyId: agency!.id,
          status,
          content,
          contactName: `เจ้าหน้าที่ ${mock.name}`,
          contactTitle: "นักวิเคราะห์นโยบายและแผน",
          contactPhone: "02-000-0000",
        },
      });
      implCreated++;
    }
  }

  console.log(`\n✓ สร้างหน่วยงาน ${agencyCreated} กรม`);
  console.log(`✓ สร้าง implementation ${implCreated} รายการ`);
  console.log(`\nLogin ทดสอบ: กรมทดสอบ1–5 / test1234`);

  // สรุปสถานะที่ seed
  const counts = await prisma.implementation.groupBy({
    by: ["status"],
    where: { agency: { name: { startsWith: "กรมทดสอบ" } } },
    _count: true,
  });
  counts.forEach((c) => console.log(`  ${c.status}: ${c._count}`));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
