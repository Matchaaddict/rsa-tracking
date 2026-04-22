import { Navbar } from "@/components/Navbar";
import { PublicDashboard } from "@/components/PublicDashboard";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PublicDashboard />
      </main>
    </div>
  );
}
