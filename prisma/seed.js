// prisma/seed.js
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
const bcrypt = require("bcryptjs");

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL || "file:./prisma/dev.db",
});
const prisma = new PrismaClient({ adapter });

const committeesData = [
  {
    name: "คณะที่ 1 ด้านการบริหารจัดการความปลอดภัยทางถนน",
    order: 1,
    guidelines: [
      { title: "พัฒนาเครื่องมือบังคับใช้กฎหมายจราจร", order: 1 },
      { title: "สร้างกลไกด้านเด็กและเยาวชน", order: 2 },
      { title: "จัดตั้งคณะทำงานเฉพาะกิจ", order: 3 },
    ],
  },
  {
    name: "คณะที่ 2 ด้านถนนและการสัญจรอย่างปลอดภัย",
    order: 2,
    guidelines: [
      { title: "ปรับปรุงโครงสร้างถนนและสิ่งแวดล้อมข้างทาง", order: 1 },
      { title: "เพิ่มความปลอดภัยสำหรับผู้สัญจรทางเท้าและจักรยาน", order: 2 },
      { title: "พัฒนาจุดพักรถและสิ่งอำนวยความสะดวก", order: 3 },
    ],
  },
  {
    name: "คณะที่ 3 ด้านยานพาหนะปลอดภัย",
    order: 3,
    guidelines: [
      { title: "ยกระดับมาตรฐานความปลอดภัยรถจักรยานยนต์", order: 1 },
      { title: "ติดตั้ง GPS สำหรับรถโดยสารสาธารณะ", order: 2 },
      { title: "กำหนดมาตรฐานวัสดุทนไฟในยานพาหนะ", order: 3 },
    ],
  },
  {
    name: "คณะที่ 4 ด้านผู้ใช้รถใช้ถนนอย่างปลอดภัย",
    order: 4,
    guidelines: [
      { title: "กำหนดคุณสมบัติพนักงานขับรถโดยสารสาธารณะ", order: 1 },
      { title: "เพิ่มมาตรการลงโทษผู้ฝ่าฝืนกฎจราจร", order: 2 },
      { title: "ปรับปรุงระบบใบอนุญาตขับขี่", order: 3 },
      { title: "บริหารจัดการเงินค่าปรับจราจร", order: 4 },
      { title: "ประเมินประสิทธิภาพเครื่องมือและมาตรการ", order: 5 },
    ],
  },
  {
    name: "คณะที่ 5 ด้านการตอบสนองหลังเกิดอุบัติเหตุ",
    order: 5,
    guidelines: [
      {
        title: "ลดระยะเวลาการเข้าถึงและช่วยเหลือผู้บาดเจ็บให้ไม่เกิน 8 นาที",
        order: 1,
      },
    ],
  },
  {
    name: "คณะที่ 6 ด้านการบริหารจัดการข้อมูลและการติดตามประเมินผล",
    order: 6,
    guidelines: [
      {
        title: "พัฒนาระบบวิเคราะห์อุบัติเหตุเชิงลึก (In-depth Investigation)",
        order: 1,
      },
    ],
  },
  {
    name: "คณะที่ 7 ด้านความปลอดภัยทางถนนขององค์กรปกครองส่วนท้องถิ่น",
    order: 7,
    guidelines: [
      { title: "ถอดบทเรียนการดำเนินงานด่านชุมชน", order: 1 },
      { title: "ปรับแผนการดำเนินงานด่านชุมชน", order: 2 },
      { title: "บูรณาการวางผังเมืองกับความปลอดภัยทางถนน", order: 3 },
      { title: "พัฒนาบริการสาธารณะผ่านกองทุน LPA", order: 4 },
    ],
  },
  {
    name: "คณะที่ 8 ด้านการรณรงค์ประชาสัมพันธ์สร้างจิตสำนึก",
    order: 8,
    guidelines: [
      { title: "พัฒนาช่องทางสื่อสารด้านประกันภัย", order: 1 },
      { title: "รณรงค์สร้างจิตสำนึกความปลอดภัยทางถนน", order: 2 },
      { title: "โครงการตาวิเศษ", order: 3 },
    ],
  },
];
