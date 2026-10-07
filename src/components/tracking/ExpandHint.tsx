import { ChevronDown, ChevronUp } from "lucide-react";

// ป้าย "ดูรายละเอียด" ที่เห็นตลอด — ผู้ใช้ไม่ต้องเลื่อนเมาส์ไปเจอเองว่าแถวนี้กดเปิดได้
// ไม่ใส่ display ไว้ใน PILL — ป้ายของ <details> สลับ hidden/inline-flex เอง
const PILL =
  "shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 transition-colors print:hidden";
const CLOSED = "bg-blue-50 text-blue-700 ring-blue-200";
const OPEN = "bg-white text-slate-500 ring-slate-200";

// สำหรับแถวที่เปิด/ปิดด้วย state
export function ExpandHint({ open, label = "ดูรายละเอียด", className = "" }: { open: boolean; label?: string; className?: string }) {
  return (
    <span className={`inline-flex ${PILL} ${open ? OPEN : CLOSED} ${className}`} aria-hidden>
      {open ? "ซ่อน" : label}
      {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
    </span>
  );
}

// สำหรับ <details>: ใช้ named group ไม่ให้ <details> ที่ซ้อนกันเปิดป้ายของกันและกัน
// group = "item" → <details className="group/item">, group = "src" → <details className="group/src">
export function DetailsHint({ group, label = "ดูรายละเอียด", className = "" }: { group: "item" | "src"; label?: string; className?: string }) {
  const closed = group === "item" ? "inline-flex group-open/item:hidden" : "inline-flex group-open/src:hidden";
  const opened = group === "item" ? "hidden group-open/item:inline-flex" : "hidden group-open/src:inline-flex";
  return (
    <>
      <span className={`${PILL} ${CLOSED} ${closed} ${className}`} aria-hidden>
        {label} <ChevronDown size={13} />
      </span>
      <span className={`${PILL} ${OPEN} ${opened} ${className}`} aria-hidden>
        ซ่อน <ChevronUp size={13} />
      </span>
    </>
  );
}

// คำแนะนำเหนือรายการ
export function TapHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-1.5 text-xs text-slate-500 print:hidden">
      <span aria-hidden>👆</span> {children}
    </p>
  );
}
