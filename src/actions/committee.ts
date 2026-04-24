"use server";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createCommittee(data: { name: string; description?: string; order?: number }) {
  await prisma.committee.create({ data });
  revalidatePath("/admin/committees");
  revalidatePath("/summary");
}

export async function updateCommittee(id: number, data: { name: string; description?: string; order?: number }) {
  await prisma.committee.update({ where: { id }, data });
  revalidatePath("/admin/committees");
  revalidatePath("/summary");
}

export async function deleteCommittee(id: number) {
  await prisma.committee.delete({ where: { id } });
  revalidatePath("/admin/committees");
  revalidatePath("/summary");
}
