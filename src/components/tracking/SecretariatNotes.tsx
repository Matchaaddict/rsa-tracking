import { ExternalLink, NotebookPen } from "lucide-react";

export type SecretariatNote = {
  id: string;
  content: string;
  sourceUrl: string | null;
  authorLabel: string;
  createdAt: string | Date;
};

// บันทึกความเคลื่อนไหวจากฝ่ายเลขานุการฯ — ข้อมูลประกอบ ไม่ใช่รายงานของหน่วยงาน และไม่นับรวมใน %
export function SecretariatNotes({ notes }: { notes?: SecretariatNote[] }) {
  if (!notes || notes.length === 0) return null;
  return (
    <div className="rounded-lg border border-teal-200 bg-teal-50/60 px-3 py-2.5">
      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-teal-800">
        <NotebookPen size={12} /> บันทึกความเคลื่อนไหวจากฝ่ายเลขานุการฯ ({notes.length})
        <span className="font-normal text-teal-700/70">· ข้อมูลประกอบ ไม่นับรวมในความคืบหน้า</span>
      </p>
      <ol className="space-y-2">
        {notes.map((n) => (
          <li key={n.id} className="text-sm">
            <p className="text-[11px] text-slate-500">
              <span className="font-medium text-teal-700">{n.authorLabel}</span> ·{" "}
              {new Date(n.createdAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}
            </p>
            <p className="whitespace-pre-wrap break-words text-slate-700">{n.content}</p>
            {n.sourceUrl && (
              <a
                href={n.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline"
              >
                แหล่งข้อมูล <ExternalLink size={10} />
              </a>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
