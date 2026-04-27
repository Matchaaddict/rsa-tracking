import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import bcrypt from "bcryptjs";

const url = process.env.DATABASE_URL ?? "file:dev.db";
const adapter = new PrismaLibSql({ url });
const prisma = new PrismaClient({ adapter });

const SUB_COMMITTEES = [
  { key: "1", name: "C1: ด้านการบริหารจัดการความปลอดภัยทางถนน" },
  { key: "2", name: "C2: ด้านถนนและการสัญจรอย่างปลอดภัย" },
  { key: "3", name: "C3: ด้านยานพาหนะปลอดภัย" },
  { key: "4", name: "C4: ด้านผู้ใช้รถใช้ถนนอย่างปลอดภัย" },
  { key: "5", name: "C5: ด้านการตอบสนองหลังเกิดอุบัติเหตุ" },
  { key: "6", name: "C6: ด้านการบริหารจัดการข้อมูลและติดตามประเมินผล" },
  { key: "7", name: "C7: ด้านความปลอดภัยทางถนนของ อปท." },
  { key: "8", name: "C8: ด้านการรณรงค์ประชาสัมพันธ์สร้างจิตสำนึก" },
];

const AGENCIES_DATA = [
  { org: "กรมป้องกันและบรรเทาสาธารณภัย (มท.)", committees: ["1","2","3","4","5","6","7","8"] },
  { org: "สำนักงานตำรวจแห่งชาติ (ตร.)", committees: ["1","2","3","4","6","7","8"] },
  { org: "กรมการขนส่งทางบก (คค.)", committees: ["1","3","4","6","7","8"] },
  { org: "กรมควบคุมโรค (สธ.)", committees: ["1","4","5","6","7","8"] },
  { org: "สนข. (สำนักงานนโยบายและแผนการขนส่งและจราจร)", committees: ["1","2","3","4","6"] },
  { org: "กรมทางหลวง (คค.)", committees: ["1","2","4","6","7"] },
  { org: "กรมทางหลวงชนบท (คค.)", committees: ["1","2","4","6","7"] },
  { org: "กรมการปกครอง (มท.)", committees: ["1","2","4","5","7","8"] },
  { org: "กรมส่งเสริมการปกครองท้องถิ่น (มท.)", committees: ["1","2","4","5","7","8"] },
  { org: "สำนักงานปลัดกระทรวงสาธารณสุข (สธ.)", committees: ["1","5","6"] },
  { org: "สถาบันการแพทย์ฉุกเฉินแห่งชาติ (สพฉ.)", committees: ["1","5","6","7"] },
  { org: "กรุงเทพมหานคร (กทม.)", committees: ["2","4","7","8"] },
  { org: "กรมประชาสัมพันธ์", committees: ["1","4","7","8"] },
  { org: "กระทรวงศึกษาธิการ", committees: ["1","4","7","8"] },
  { org: "บริษัท กลางคุ้มครองผู้ประสบภัยจากรถ จำกัด", committees: ["4","5","6","7","8"] },
  { org: "องค์การอนามัยโลก (WHO)", committees: ["1","5","8"] },
  { org: "ศวปถ. (ศูนย์วิชาการเพื่อความปลอดภัยทางถนน)", committees: ["6","7","8"] },
  { org: "สสส.", committees: ["5","7","8"] },
  { org: "มูลนิธิเมาไม่ขับ", committees: ["4","7","8"] },
  { org: "สำนักงานเครือข่ายลดอุบัติเหตุ (สคอ.)", committees: ["4","7","8"] },
  { org: "สภาเด็กและเยาวชนแห่งประเทศไทย", committees: ["1","4","7","8"] },
  { org: "สถาบันยุวทัศน์แห่งประเทศไทย", committees: ["1","4","8"] },
  { org: "สำนักงานเครือข่ายองค์กรงดเหล้า (สคล.)", committees: ["7","8"] },
  { org: "สถาบันวิจัยเพื่อการพัฒนาประเทศไทย (TDRI) / มูลนิธิ TDRI", committees: ["1","3","6"] },
  { org: "สำนักงานปลัดกระทรวงคมนาคม (คค.)", committees: ["1","2","3","6"] },
  { org: "กระทรวงมหาดไทย", committees: ["1"] },
  { org: "สมาคม อบจ.", committees: ["2","7"] },
  { org: "สมาคมสันนิบาตเทศบาล", committees: ["2","4","7"] },
  { org: "สมาคม อบต.", committees: ["2","7"] },
  { org: "กองบังคับการตำรวจทางหลวง (ตร.)", committees: ["2","4","7"] },
  { org: "กองบังคับการตำรวจจราจร / นครบาล (ตร.)", committees: ["2","4"] },
  { org: "สมาคมอุตสาหกรรมยานยนต์ไทย", committees: ["3","4"] },
  { org: "กระทรวงการคลัง", committees: ["1"] },
  { org: "สำนักงาน ก.พ.ร.", committees: ["1"] },
  { org: "สำนักงานสภาพัฒน์ฯ (สศช.)", committees: ["1"] },
  { org: "สำนักงบประมาณ", committees: ["1"] },
  { org: "สำนักงานการตรวจเงินแผ่นดิน (สตง.)", committees: ["1"] },
  { org: "สำนักงานอัยการสูงสุด", committees: ["1"] },
  { org: "สำนักงานคณะกรรมการกฤษฎีกา", committees: ["1"] },
  { org: "กรมสวัสดิการและคุ้มครองแรงงาน", committees: ["1","4"] },
  { org: "กระทรวง อว.", committees: ["1","4"] },
  { org: "มหาวิทยาลัยเทคโนโลยีสุรนารี", committees: ["1"] },
  { org: "มหาวิทยาลัยขอนแก่น", committees: ["1"] },
  { org: "มจธ.", committees: ["1"] },
  { org: "มหาวิทยาลัยเชียงใหม่", committees: ["1"] },
  { org: "มหาวิทยาลัยสงขลานครินทร์", committees: ["1"] },
  { org: "สมาคมวิทยาการจราจรและขนส่ง", committees: ["1"] },
  { org: "กรมการขนส่งทางราง (คค.)", committees: ["2"] },
  { org: "กรมโยธาธิการและผังเมือง (มท.)", committees: ["2"] },
  { org: "กองบังคับการตำรวจน้ำ (ตร.)", committees: ["2"] },
  { org: "กรมเจ้าท่า (คค.)", committees: ["2"] },
  { org: "การรถไฟแห่งประเทศไทย", committees: ["2"] },
  { org: "การทางพิเศษแห่งประเทศไทย", committees: ["2"] },
  { org: "วิศวกรรมสถานแห่งประเทศไทย (วสท.)", committees: ["2"] },
  { org: "สภาวิศวกร", committees: ["3"] },
  { org: "สมาคมชิ้นส่วนยานยนต์ไทย", committees: ["3"] },
  { org: "สมาคมยานยนต์ไฟฟ้าไทย", committees: ["3"] },
  { org: "มูลนิธิคุ้มครองผู้บริโภค", committees: ["3"] },
  { org: "สจพ. พระนครเหนือ", committees: ["3"] },
  { org: "สมาคมระบบขนส่งและจราจรอัจฉริยะ", committees: ["3"] },
  { org: "สพฐ. (ศธ.)", committees: ["4"] },
  { org: "สช. (ศธ.)", committees: ["4"] },
  { org: "สอศ. (ศธ.)", committees: ["4"] },
  { org: "กรมสรรพสามิต (กค.)", committees: ["4"] },
  { org: "สมาคมผู้ประกอบการรถจักรยานยนต์ไทย", committees: ["4","8"] },
  { org: "บริษัท โตโยต้า มอเตอร์ ประเทศไทย จำกัด", committees: ["4"] },
  { org: "มูลนิธิป้องกันอุบัติภัยแห่งเอเชีย (AIP)", committees: ["4"] },
  { org: "บริษัท เอ.พี. ฮอนด้า จำกัด", committees: ["4","8"] },
  { org: "บริษัท ไทยยามาฮ่ามอเตอร์ จำกัด", committees: ["4"] },
  { org: "มูลนิธิป้องกันอุบัติเหตุทางถนนและอาชญากรรม", committees: ["4"] },
  { org: "กรมการแพทย์ (สธ.)", committees: ["5"] },
  { org: "กรมสนับสนุนบริการสุขภาพ (สธ.)", committees: ["5"] },
  { org: "ชมรมโรงพยาบาลศูนย์/โรงพยาบาลทั่วไป", committees: ["5"] },
  { org: "สปสช.", committees: ["5"] },
  { org: "คปภ.", committees: ["5","8"] },
  { org: "สำนักงานประกันสังคม", committees: ["5"] },
  { org: "สำนักงานสถิติแห่งชาติ", committees: ["6"] },
  { org: "มูลนิธิไทยโรดส์", committees: ["6"] },
  { org: "มูลนิธิประชาปลอดภัย", committees: ["6"] },
  { org: "กระทรวงคมนาคม (ภาพรวม)", committees: ["7","8"] },
  { org: "กระทรวงสาธารณสุข (ภาพรวม)", committees: ["7","8"] },
  { org: "สกถ.", committees: ["7"] },
  { org: "สอจร. (แผนงานสนับสนุนฯ ระดับจังหวัด)", committees: ["7"] },
  { org: "กระทรวงกลาโหม", committees: ["8"] },
  { org: "กระทรวงวัฒนธรรม", committees: ["8"] },
  { org: "กรมส่งเสริมวัฒนธรรม (วธ.)", committees: ["8"] },
  { org: "กสทช.", committees: ["8"] },
  { org: "บมจ. อสมท", committees: ["8"] },
  { org: "บริษัท แปซิฟิคคอร์ปอเรชั่น (จส.100)", committees: ["8"] },
  { org: "สถานีโทรทัศน์ไทยพีบีเอส", committees: ["8"] },
  { org: "สถานีวิทยุโทรทัศน์แห่งประเทศไทย", committees: ["8"] },
];

async function main() {
  // Admin
  const adminPassword = await bcrypt.hash("admin1234", 10);
  await prisma.admin.upsert({
    where: { username: "admin" },
    update: {},
    create: { username: "admin", password: adminPassword },
  });
  console.log("✓ Admin created: admin / admin1234");

  // Sub-committees
  const scMap: Record<string, string> = {};
  for (const sc of SUB_COMMITTEES) {
    const created = await prisma.subCommittee.upsert({
      where: { name: sc.name },
      update: {},
      create: { name: sc.name },
    });
    scMap[sc.key] = created.id;
  }
  console.log(`✓ ${SUB_COMMITTEES.length} sub-committees created`);

  // Agencies (86 หน่วยงาน)
  const DEFAULT_PASS = "pass1234";
  const defaultPassword = await bcrypt.hash(DEFAULT_PASS, 10);
  let count = 0;
  let backfilled = 0;
  for (let i = 0; i < AGENCIES_DATA.length; i++) {
    const ag = AGENCIES_DATA[i];
    const username = `agency${(i + 1).toString().padStart(3, "0")}`;
    const existing = await prisma.agency.findUnique({ where: { username } });
    if (!existing) {
      await prisma.agency.create({
        data: {
          name: ag.org,
          username,
          password: defaultPassword,
          plainPassword: DEFAULT_PASS,
          subCommittees: {
            create: ag.committees.map((cKey) => ({ subCommitteeId: scMap[cKey] })),
          },
        },
      });
      count++;
    } else if (!existing.passwordChangedByAgency && !existing.plainPassword) {
      // Backfill plainPassword for agencies seeded before this field existed
      await prisma.agency.update({
        where: { id: existing.id },
        data: { plainPassword: DEFAULT_PASS },
      });
      backfilled++;
    }
  }
  console.log(`✓ ${count} agencies created, ${backfilled} backfilled (total: ${AGENCIES_DATA.length}, password: ${DEFAULT_PASS})`);
  console.log("  Usernames: agency001 ... agency086");

  // Site config defaults
  const siteDefaults = [
    { key: "hero_label", value: "RSAT" },
    { key: "hero_title", value: "ระบบติดตามข้อเสนอแนวทางป้องกันและลดอุบัติเหตุทางถนน" },
    { key: "hero_subtitle", value: "ในช่วงการรณรงค์เทศกาล ฯ" },
    { key: "site_page_title", value: "ระบบติดตามข้อเสนอแนวทางฯ | RSAT" },
    { key: "site_footnote", value: "" },
  ];
  for (const cfg of siteDefaults) {
    await prisma.siteConfig.upsert({ where: { key: cfg.key }, update: {}, create: cfg });
  }
  console.log("✓ Site config defaults set");

  console.log("\n=== Seed Complete ===");
  console.log("Admin login:   admin / admin1234");
  console.log("Agency logins: agency001–agency086 / pass1234");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
