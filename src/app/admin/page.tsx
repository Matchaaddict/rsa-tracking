import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { AdminPanel } from "@/components/AdminPanel";

export default async function AdminPage() {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AdminPanel
          isSuperAdmin={session.user.isSuperAdmin ?? false}
          permissions={session.user.permissions ?? "[]"}
          adminId={session.user.id ?? ""}
        />
      </main>
    </div>
  );
}
