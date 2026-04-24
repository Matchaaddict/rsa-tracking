import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth();
  if (!session?.user) {
    redirect("/summary");
  }
  const isAdmin = (session.user as { isAdmin?: boolean })?.isAdmin;
  redirect(isAdmin ? "/admin" : "/dashboard");
}
