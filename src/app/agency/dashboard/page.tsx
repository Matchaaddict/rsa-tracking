import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { AgencyDashboard } from "@/components/AgencyDashboard";

export default async function AgencyDashboardPage() {
  const session = await auth();
  if (!session || session.user.role !== "agency") {
    redirect("/agency/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AgencyDashboard agencyId={session.user.id!} agencyName={session.user.name!} />
      </main>
    </div>
  );
}
