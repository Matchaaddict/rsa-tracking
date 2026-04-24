"use server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function submitResponse(guidelineId: number, progress: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const agencyId = parseInt(session.user.id);
  if (isNaN(agencyId)) throw new Error("Invalid session");

  await prisma.response.upsert({
    where: { agencyId_guidelineId: { agencyId, guidelineId } },
    update: { progress, updatedAt: new Date() },
    create: { agencyId, guidelineId, progress },
  });

  revalidatePath("/dashboard");
  revalidatePath("/summary");
}

export async function deleteResponse(guidelineId: number) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const agencyId = parseInt(session.user.id);

  await prisma.response.deleteMany({ where: { agencyId, guidelineId } });
  revalidatePath("/dashboard");
  revalidatePath("/summary");
}
