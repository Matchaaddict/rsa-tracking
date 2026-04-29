import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "admin") return null;
  return session;
}

interface ParsedFAQ { question: string; answer: string; }

function parseMarkdown(md: string): ParsedFAQ[] {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const items: ParsedFAQ[] = [];
  let current: ParsedFAQ | null = null;
  let buffer: string[] = [];

  const flush = () => {
    if (current) {
      current.answer = buffer.join("\n").trim();
      if (current.question && current.answer) items.push(current);
    }
    buffer = [];
  };

  for (const line of lines) {
    const m = line.match(/^##\s+(.+?)\s*$/);
    if (m) {
      flush();
      const q = m[1].replace(/^\d+[.)]\s*/, "").trim();
      current = { question: q, answer: "" };
    } else if (current) {
      buffer.push(line);
    }
  }
  flush();
  return items;
}

export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { markdown, mode } = await req.json() as { markdown: string; mode?: "append" | "replace" };
  if (typeof markdown !== "string" || !markdown.trim()) {
    return NextResponse.json({ error: "markdown is required" }, { status: 400 });
  }

  const parsed = parseMarkdown(markdown);
  if (parsed.length === 0) {
    return NextResponse.json({ error: "ไม่พบ FAQ ในไฟล์ — ใช้ '## คำถาม' เป็นหัวข้อ" }, { status: 400 });
  }

  if (mode === "replace") {
    await prisma.fAQ.deleteMany({});
  }

  const startOrder = mode === "replace" ? 0 : await prisma.fAQ.count();
  const existing = mode === "replace" ? new Set<string>() : new Set(
    (await prisma.fAQ.findMany({ select: { question: true } })).map((f) => f.question)
  );

  let created = 0;
  let skipped = 0;
  for (let i = 0; i < parsed.length; i++) {
    const { question, answer } = parsed[i];
    if (existing.has(question)) { skipped++; continue; }
    await prisma.fAQ.create({
      data: { question, answer, published: true, orderNum: startOrder + created },
    });
    created++;
  }

  return NextResponse.json({ created, skipped, total: parsed.length });
}
