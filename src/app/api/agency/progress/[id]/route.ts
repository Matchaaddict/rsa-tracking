import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAgency() {
  const session = await auth();
  if (!session || session.user.role !== "agency") return null;
  return session;
}

async function loadOwnedEntry(id: string, agencyId: string) {
  return prisma.progressEntry.findFirst({
    where: { id, implementation: { agencyId } },
    include: { implementation: { select: { id: true } } },
  });
}

async function syncLatest(implementationId: string) {
  const latest = await prisma.progressEntry.findFirst({
    where: { implementationId },
    orderBy: { createdAt: "desc" },
    select: { content: true, status: true, contactName: true, contactTitle: true, contactPhone: true },
  });
  await prisma.implementation.update({
    where: { id: implementationId },
    data: {
      content: latest?.content ?? "",
      status: latest?.status ?? "NOT_STARTED",
      contactName: latest?.contactName ?? null,
      contactTitle: latest?.contactTitle ?? null,
      contactPhone: latest?.contactPhone ?? null,
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAgency();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const agencyId = session.user.id!;
  const entry = await loadOwnedEntry(id, agencyId);
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { content, status, contactName, contactTitle, contactPhone } = await req.json();
  if (!content?.trim() && status !== "NOT_RELEVANT") {
    return NextResponse.json({ error: "Content required" }, { status: 400 });
  }
  if (!contactName?.trim() || !contactTitle?.trim() || !contactPhone?.trim()) {
    return NextResponse.json({ error: "Reporter contact required" }, { status: 400 });
  }

  const updated = await prisma.progressEntry.update({
    where: { id },
    data: {
      content: content ?? "",
      status,
      contactName: contactName.trim(),
      contactTitle: contactTitle.trim(),
      contactPhone: contactPhone.trim(),
    },
  });

  await syncLatest(entry.implementation.id);
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAgency();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const agencyId = session.user.id!;
  const entry = await loadOwnedEntry(id, agencyId);
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.progressEntry.delete({ where: { id } });
  await syncLatest(entry.implementation.id);

  return NextResponse.json({ ok: true });
}
