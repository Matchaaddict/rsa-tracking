"use server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createAgency(data: {
  name: string;
  username: string;
  password: string;
  committeeId: number | null;
  isAdmin: boolean;
}) {
  const hashed = await hash(data.password, 10);
  await prisma.agency.create({
    data: {
      name: data.name,
      username: data.username,
      password: hashed,
      committeeId: data.committeeId,
      isAdmin: data.isAdmin,
    },
  });
  revalidatePath("/admin/agencies");
}

export async function updateAgency(
  id: number,
  data: { name: string; username: string; password?: string; committeeId: number | null; isAdmin: boolean }
) {
  const updateData: {
    name: string;
    username: string;
    committeeId: number | null;
    isAdmin: boolean;
    password?: string;
  } = {
    name: data.name,
    username: data.username,
    committeeId: data.committeeId,
    isAdmin: data.isAdmin,
  };
  if (data.password) {
    updateData.password = await hash(data.password, 10);
  }
  await prisma.agency.update({ where: { id }, data: updateData });
  revalidatePath("/admin/agencies");
}

export async function deleteAgency(id: number) {
  await prisma.agency.delete({ where: { id } });
  revalidatePath("/admin/agencies");
}
