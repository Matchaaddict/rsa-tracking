import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { faqs, published } = (await req.json()) as {
    faqs?: { question: string; answer: string }[];
    published?: boolean;
  };

  if (!Array.isArray(faqs) || faqs.length === 0) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const count = await prisma.fAQ.count();
  let next = count;
  let created = 0;

  for (const f of faqs) {
    const q = f.question?.trim();
    const a = f.answer?.trim();
    if (!q || !a) continue;
    await prisma.fAQ.create({
      data: {
        question: q,
        answer: a,
        published: published ?? true,
        orderNum: next++,
      },
    });
    created++;
  }

  return NextResponse.json({ created });
}
