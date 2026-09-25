"use client";

import { Printer } from "lucide-react";

// พิมพ์เฉพาะส่วน "เรื่องสืบเนื่อง" ใช้เป็นเอกสารประกอบวาระสืบเนื่องในการประชุมครั้งถัดไป
export function PrintCarryOverButton() {
  function print() {
    document.body.classList.add("print-carryover");
    // เปิด <details> ทุกอันในส่วนที่พิมพ์ เพื่อให้รายชื่อหน่วยงานออกมาด้วย
    const opened: HTMLDetailsElement[] = [];
    document.querySelectorAll<HTMLDetailsElement>("[data-carryover] details:not([open])").forEach((d) => {
      d.open = true;
      opened.push(d);
    });
    const cleanup = () => {
      document.body.classList.remove("print-carryover");
      opened.forEach((d) => (d.open = false));
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    window.print();
  }

  return (
    <button
      onClick={print}
      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 print:hidden"
    >
      <Printer size={16} /> พิมพ์เรื่องสืบเนื่อง
    </button>
  );
}
