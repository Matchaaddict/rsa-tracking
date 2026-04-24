import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const { agencyId, festivalId } = await req.json();

  const [agency, festival] = await Promise.all([
    prisma.agency.findUnique({
      where: { id: agencyId },
      include: { subCommittees: true },
    }),
    prisma.festival.findUnique({
      where: { id: festivalId },
      include: {
        proposals: {
          include: {
            subCommittees: { include: { subCommittee: true } },
            implementations: { where: { agencyId } },
          },
          orderBy: { orderNumber: "asc" },
        },
      },
    }),
  ]);

  if (!agency || !festival) {
    return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
  }

  const agencyScIds = new Set(agency.subCommittees.map((a) => a.subCommitteeId));

  const responsible = festival.proposals.filter((p) =>
    p.subCommittees.some((psc) => agencyScIds.has(psc.subCommitteeId))
  );

  let proposalText = "";
  for (const p of responsible) {
    const impl = p.implementations[0];
    const scNames = p.subCommittees.map((psc) => psc.subCommittee.name).join(", ");
    proposalText += `\n**ข้อที่ ${p.orderNumber}: ${p.title}**\n`;
    proposalText += `อนุกรรมการ: ${scNames}\n`;
    if (impl?.content?.trim()) {
      proposalText += `สถานะ: ${impl.status}\n`;
      proposalText += `การดำเนินการ: ${impl.content}\n`;
    } else {
      proposalText += `สถานะ: ยังไม่ได้กรอกข้อมูล\n`;
    }
  }

  const prompt = `คุณเป็นนักวิเคราะห์นโยบายด้านความปลอดภัยทางถนน ประเมินความก้าวหน้าของหน่วยงานตามข้อเสนอแนวทางของ ศวปถ.

หน่วยงาน: ${agency.name}
เทศกาล: ${festival.name}
จำนวนข้อเสนอที่รับผิดชอบ: ${responsible.length} ข้อ

---
${proposalText}
---

วิเคราะห์อย่างละเอียดและเจาะลึก ครอบคลุม 4 ประเด็นนี้:

## 1. ภาพรวมการดำเนินงาน
สรุปสถานะโดยรวม ระบุจำนวนข้อที่ตอบแล้ว / กำลังดำเนินการ / ยังไม่ดำเนินการ

## 2. จุดแข็ง — สิ่งที่ทำได้ดี
ข้อเสนอที่มีการดำเนินการชัดเจน ครบถ้วน พร้อมเหตุผลที่ถือว่าดี

## 3. สิ่งที่ยังขาดหรือไม่ครบ — วิเคราะห์รายข้อ
สำหรับแต่ละข้อที่มีปัญหา ระบุให้ชัดเจนว่าขาดอะไร เช่น:
- ไม่มีผู้รับผิดชอบที่ระบุชื่อ
- ไม่มีระยะเวลาดำเนินการ
- ไม่มีตัวชี้วัดหรือเป้าหมายที่วัดได้
- เนื้อหากว้างหรือคลุมเครือเกินไป
- ยังไม่ได้กรอกข้อมูลเลย

## 4. ข้อเสนอแนะเชิงปฏิบัติ
คำแนะนำที่นำไปใช้ได้จริง เฉพาะเจาะจงสำหรับแต่ละข้อที่ต้องปรับปรุง

ตอบเป็นภาษาไทย ตรงไปตรงมา ไม่ต้องสุภาพเกินไป`;

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        const response = await anthropic.messages.create({
          model: "claude-opus-4-7",
          max_tokens: 2048,
          stream: true,
          messages: [{ role: "user", content: prompt }],
        });

        for await (const event of response) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } catch (e) {
        controller.error(e);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
