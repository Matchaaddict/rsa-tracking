import { prisma } from "@/lib/db";
import { updateAgency, deleteAgency } from "@/actions/agency";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AgencyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const agencyId = parseInt(id);
  const [agency, committees] = await Promise.all([
    prisma.agency.findUnique({
      where: { id: agencyId },
      include: { committee: true, responses: { include: { guideline: { select: { title: true } } } } },
    }),
    prisma.committee.findMany({ orderBy: { order: "asc" } }),
  ]);
  if (!agency) redirect("/admin/agencies");

  async function handleUpdate(formData: FormData) {
    "use server";
    const committeeIdStr = formData.get("committeeId") as string;
    const password = formData.get("password") as string;
    await updateAgency(agencyId, {
      name: formData.get("name") as string,
      username: formData.get("username") as string,
      password: password || undefined,
      committeeId: committeeIdStr ? parseInt(committeeIdStr) : null,
      isAdmin: formData.get("isAdmin") === "true",
    });
    redirect("/admin/agencies");
  }

  async function handleDelete() {
    "use server";
    await deleteAgency(agencyId);
    redirect("/admin/agencies");
  }

  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/admin/agencies" className="text-blue-600 hover:underline text-sm">← หน่วยงาน</Link>
        <span className="text-gray-400">/</span>
        <span className="text-sm text-gray-700">{agency.name}</span>
      </div>

      <div className="bg-white rounded-xl shadow p-5 mb-6">
        <h2 className="font-semibold text-gray-700 mb-4">แก้ไขข้อมูล</h2>
        <form action={handleUpdate} className="space-y-3">
          <input name="name" defaultValue={agency.name} required placeholder="ชื่อหน่วยงาน"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          <input name="username" defaultValue={agency.username} required placeholder="username"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          <input name="password" type="password" placeholder="รหัสผ่านใหม่ (ว่างไว้เพื่อไม่เปลี่ยน)"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          <select name="committeeId" defaultValue={agency.committeeId ?? ""}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
            <option value="">-- เลือกอนุกรรมการ --</option>
            {committees.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select name="isAdmin" defaultValue={String(agency.isAdmin)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
            <option value="false">หน่วยงาน</option>
            <option value="true">ผู้ดูแลระบบ</option>
          </select>
          <div className="flex gap-3 pt-1">
            <button type="submit" className="flex-1 bg-blue-700 hover:bg-blue-800 text-white py-2 rounded-lg text-sm">บันทึก</button>
            <form action={handleDelete}>
              <button type="submit" className="px-4 py-2 text-red-500 hover:text-red-700 text-sm border border-red-200 rounded-lg hover:bg-red-50">
                ลบ
              </button>
            </form>
          </div>
        </form>
      </div>

      {agency.responses.length > 0 && (
        <div className="bg-white rounded-xl shadow p-5">
          <h2 className="font-semibold text-gray-700 mb-3">การรายงานที่ส่งแล้ว ({agency.responses.length})</h2>
          <div className="space-y-2">
            {agency.responses.map((r) => (
              <div key={r.id} className="text-sm p-3 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-700 mb-1">{r.guideline.title}</p>
                <p className="text-gray-600 text-xs whitespace-pre-wrap">{r.progress}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
