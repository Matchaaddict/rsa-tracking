import { prisma } from "@/lib/db";
import { updateCommittee, deleteCommittee } from "@/actions/committee";
import { createGuideline, deleteGuideline } from "@/actions/guideline";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function CommitteeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const committeeId = parseInt(id);
  const committee = await prisma.committee.findUnique({
    where: { id: committeeId },
    include: {
      guidelines: { orderBy: { order: "asc" }, include: { _count: { select: { responses: true } } } },
      agencies: { where: { isAdmin: false }, orderBy: { name: "asc" } },
    },
  });
  if (!committee) redirect("/admin/committees");

  async function handleUpdateCommittee(formData: FormData) {
    "use server";
    await updateCommittee(committeeId, {
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || undefined,
      order: parseInt(formData.get("order") as string) || 0,
    });
  }

  async function handleDeleteCommittee() {
    "use server";
    await deleteCommittee(committeeId);
    redirect("/admin/committees");
  }

  async function handleCreateGuideline(formData: FormData) {
    "use server";
    await createGuideline({
      title: formData.get("title") as string,
      description: (formData.get("description") as string) || undefined,
      committeeId,
      order: parseInt(formData.get("order") as string) || 0,
    });
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/admin/committees" className="text-blue-600 hover:underline text-sm">← อนุกรรมการ</Link>
        <span className="text-gray-400">/</span>
        <span className="text-sm text-gray-700">{committee.name}</span>
      </div>

      <div className="bg-white rounded-xl shadow p-5 mb-6">
        <h2 className="font-semibold text-gray-700 mb-4">แก้ไขข้อมูลอนุกรรมการ</h2>
        <form action={handleUpdateCommittee} className="space-y-3">
          <input name="name" defaultValue={committee.name} required placeholder="ชื่ออนุกรรมการ"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          <textarea name="description" defaultValue={committee.description ?? ""} rows={2} placeholder="คำอธิบาย (ถ้ามี)"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          <div className="flex items-center gap-3">
            <input name="order" type="number" defaultValue={committee.order} placeholder="ลำดับ"
              className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <button type="submit" className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm">บันทึก</button>
            <form action={handleDeleteCommittee} className="ml-auto">
              <button type="submit"
                className="text-red-500 hover:text-red-700 text-sm underline"
                onClick={(e) => { if (!confirm("ลบอนุกรรมการนี้?")) e.preventDefault(); }}>
                ลบอนุกรรมการ
              </button>
            </form>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow p-5 mb-6">
        <h2 className="font-semibold text-gray-700 mb-4">ข้อเสนอแนวทาง ({committee.guidelines.length} ข้อ)</h2>
        <form action={handleCreateGuideline} className="space-y-2 mb-4 pb-4 border-b border-gray-100">
          <input name="title" required placeholder="ชื่อข้อเสนอแนวทาง"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          <textarea name="description" rows={2} placeholder="รายละเอียด (ถ้ามี)"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          <div className="flex gap-2">
            <input name="order" type="number" placeholder="ลำดับ" defaultValue={committee.guidelines.length + 1}
              className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
            <button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm">เพิ่มแนวทาง</button>
          </div>
        </form>
        <div className="space-y-2">
          {committee.guidelines.map((g, idx) => (
            <div key={g.id} className="flex items-start justify-between gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <span className="text-xs text-blue-700 font-bold mr-2">ข้อ {idx + 1}</span>
                <span className="text-sm text-gray-800">{g.title}</span>
                <span className="ml-2 text-xs text-gray-400">({g._count.responses} การรายงาน)</span>
              </div>
              <form action={async () => { "use server"; await deleteGuideline(g.id); }}>
                <button type="submit" className="text-red-400 hover:text-red-600 text-xs underline flex-shrink-0">ลบ</button>
              </form>
            </div>
          ))}
          {committee.guidelines.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-2">ยังไม่มีแนวทาง</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-5">
        <h2 className="font-semibold text-gray-700 mb-3">หน่วยงานในอนุกรรมการนี้ ({committee.agencies.length})</h2>
        <div className="flex flex-wrap gap-2">
          {committee.agencies.map((a) => (
            <Link key={a.id} href={`/admin/agencies/${a.id}`}
              className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded-full hover:bg-blue-100">
              {a.name}
            </Link>
          ))}
          {committee.agencies.length === 0 && (
            <p className="text-sm text-gray-400">ยังไม่มีหน่วยงาน</p>
          )}
        </div>
        <Link href="/admin/agencies" className="block mt-3 text-sm text-blue-600 hover:underline">
          + จัดการหน่วยงาน
        </Link>
      </div>
    </div>
  );
}
