// ช่องรูปที่แอดมินเปลี่ยนเองได้ — ไม่มีรูป = ใช้ภาพวาดเริ่มต้นของระบบ
export type ImageSlot = {
  key: string;
  label: string;
  where: string;
  hint: string;
  maxW: number;
  maxH: number;
  aspect: string; // สำหรับกรอบตัวอย่าง (CSS aspect-ratio)
  prompt: string; // ตัวอย่างคำสั่งสำหรับสร้างรูปด้วย AI (เช่น Higgsfield)
};

const CARD_STYLE =
  "Soft 3D illustration, pastel colors, isometric view, transparent background, centered, no text, no logo, of";

export const IMAGE_SLOTS: ImageSlot[] = [
  {
    key: "hero_banner",
    label: "แบนเนอร์หน้าแรก",
    where: "ภาพใหญ่ด้านบนหน้าแรก (ข้อความอยู่ซ้าย)",
    hint: "แนวนอน 21:5 กว้างอย่างน้อย 2400px — ฝั่งซ้ายควรโล่งหรือมืดเพื่อวางข้อความ",
    maxW: 2800,
    maxH: 1200,
    aspect: "21 / 5",
    prompt: "Wide cinematic photo of a modern Thai city skyline (Bangkok-style towers) with a multi-lane elevated expressway and flowing traffic in the foreground, green trees along the road, clear blue sky, soft morning light, realistic photography, left 45% of the image slightly darker and less detailed to leave space for text, no text, no logos, no watermark, 21:5 aspect ratio",
  },
  {
    key: "sidebar_bg",
    label: "พื้นหลังแถบเมนูซ้าย",
    where: "แถบเมนูด้านซ้ายทุกหน้า",
    hint: "แนวตั้ง 1:3 เช่น 600×1800px — ส่วนบนควรมืดเพื่อให้เมนูอ่านง่าย",
    maxW: 900,
    maxH: 2700,
    aspect: "1 / 3",
    prompt: "Vertical night photo of a winding highway through a city at dusk, glowing light trails, deep navy blue and teal tones, city buildings softly blurred at the bottom, top two-thirds mostly dark and empty, no text, no logos, 1:3 aspect ratio",
  },
  {
    key: "kpi_total",
    label: "การ์ด: ทั้งหมด",
    where: "มุมขวาบนการ์ดจำนวนเรื่องทั้งหมด",
    hint: "สี่เหลี่ยมจัตุรัส 512×512px พื้นหลังโปร่งใส (PNG/WebP)",
    maxW: 512,
    maxH: 512,
    aspect: "1 / 1",
    prompt: `${CARD_STYLE} a stack of blue documents and folders`,
  },
  {
    key: "kpi_done",
    label: "การ์ด: ดำเนินการแล้ว",
    where: "มุมขวาบนการ์ดดำเนินการแล้ว",
    hint: "สี่เหลี่ยมจัตุรัส 512×512px พื้นหลังโปร่งใส",
    maxW: 512,
    maxH: 512,
    aspect: "1 / 1",
    prompt: `${CARD_STYLE} a green road with small trees and a check mark`,
  },
  {
    key: "kpi_progress",
    label: "การ์ด: กำลังดำเนินการ",
    where: "มุมขวาบนการ์ดกำลังดำเนินการ",
    hint: "สี่เหลี่ยมจัตุรัส 512×512px พื้นหลังโปร่งใส",
    maxW: 512,
    maxH: 512,
    aspect: "1 / 1",
    prompt: `${CARD_STYLE} an orange traffic cone next to a construction barrier`,
  },
  {
    key: "kpi_pending",
    label: "การ์ด: ยังไม่ดำเนินการ",
    where: "มุมขวาบนการ์ดยังไม่ดำเนินการ",
    hint: "สี่เหลี่ยมจัตุรัส 512×512px พื้นหลังโปร่งใส",
    maxW: 512,
    maxH: 512,
    aspect: "1 / 1",
    prompt: `${CARD_STYLE} a red and white warning road barrier with a triangle sign`,
  },
  {
    key: "login_bg",
    label: "พื้นหลังหน้าเข้าสู่ระบบ",
    where: "หน้าเข้าสู่ระบบของแอดมินและหน่วยงาน",
    hint: "แนวนอน 16:9 กว้าง 1920px",
    maxW: 2400,
    maxH: 1600,
    aspect: "16 / 9",
    prompt: "Wide photo of a Thai city expressway at golden hour, soft focus, calm blue and warm tones, realistic, center area simple and uncluttered, no text, no logos, 16:9 aspect ratio",
  },
];

export const imageUrl = (key: string, version?: number) =>
  `/api/public/images/${key}${version ? `?v=${version}` : ""}`;
