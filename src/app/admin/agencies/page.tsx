import { prisma } from "@/lib/db";
import { createAgency } from "@/actions/agency";
import Link from "next/link";

export default async function AgenciesPage() {
  const [agencies, committees] = await Promise.all([
    prisma.agency.findMany({
      orderBy: [{ isAdmin: "desc" }, { committee: { order: "asc" } }, { name: "asc" }],
      include: { committee: { select: { name: true } }, _count: { select: { responses: true } } },
    }),
    prisma.committee.findMany({ orderBy: { order: "asc" } }),
  ]);

  async function handleCreate(formData: FormData) {
    "use server";
    const committeeIdStr = formData.get("committeeId") as string;
    const isAdmin = formData.get("isAdmin") === "true";
    await createAgency({
      name: formData.get("name") as string,
      username: formData.get("username") as string,
      password: formData.get("password") as string,
      committeeId: committeeIdStr ? parseInt(committeeIdStr) : null,
      isAdmin,
    });
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">หน่วยงาน</h1>

      <div className="bg-white rounded-xl shadow p-5 mb-6">
        <h2 className="font-semibold text-gray-700 mb-4">เพิ่มหน่วยงาน / ผู้ดูแลระบบ</h2>
        <form action={handleCreate} className="grid grid-cols-2 gap-3">
          <input name="name" required placeholder="ชื่อหน่วยงาน"
            className="col-span-2 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          <input name="username" required placeholder="username"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          <input name="password" required placeholder="รหัสผ่าน" type="password"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          <select name="committeeId"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
            <option value="">-- เลือกอนุกรรมการ --</option>
            {committees.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select name="isAdmin"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
            <option value="false">หน่วยงาน</option>
            <option value="true">ผู้ดูแลระบบ</option>
          </select>
          <button type="submit" className="col-span-2 bg-blue-700 hover:bg-blue-800 text-white py-2 rounded-lg text-sm transition-colors">
            เพิ่ม
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left">ชื่อหน่วยงาน</th>
              <th className="px-4 py-3 text-left">Username</th>
              <th className="px-4 py-3 text-left">อนุกรรมการ</th>
              <th className="px-4 py-3 text-center">รายงาน</th>
              <th className="px-4 py-3 text-center">บทบาท</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {agencies.map((a) => (
              <tr key={a.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{a.name}</td>
                <td className="px-4 py-3 text-gray-500 font-mono text-xs">{a.username}</td>
                <td className="px-4 py-3 text-gray-600">{a.committee?.name ?? "—"}</td>
                <td className="px-4 py-3 text-center text-gray-600">{a._count.responses}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${a.isAdmin ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                    {a.isAdmin ? "Admin" : "หน่วยงาน"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/agencies/${a.id}`} className="text-blue-600 hover:underline text-xs">แก้ไข</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {agencies.length === 0 && (
          <p className="text-center text-gray-400 py-8">ยังไม่มีหน่วยงาน</p>
        )}
      </div>
    </div>
  );
}
