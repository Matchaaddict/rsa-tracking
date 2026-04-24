"use server";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createGuideline(data: {
  title: string;
  description?: string;
  committeeId: number;
  order?: number;
}) {
  await prisma.guideline.create({ data });
  revalidatePath("/admin/committees");
  revalidatePath("/summary");
}

export async function updateGuideline(
  id: number,
  data: { title: string; description?: string; order?: number }
) {
  await prisma.guideline.update({ where: { id }, data });
  revalidatePath("/admin/committees");
  revalidatePath("/summary");
}

export async function deleteGuideline(id: number) {
  await prisma.guideline.delete({ where: { id } });
  revalidatePath("/admin/committees");
  revalidatePath("/summary");
}
