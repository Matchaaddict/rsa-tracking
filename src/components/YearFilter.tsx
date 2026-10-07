// ตัวเลือกปี (ทุกปี / ปี 2569 / ปี 2568 …) — แสดงเฉพาะเมื่อข้อมูลมีมากกว่า 1 ปี
export type YearValue = number | "all";

export function yearsOf(items: { year: number }[]) {
  return [...new Set(items.map((i) => i.year))].sort((a, b) => b - a);
}

export function YearFilter({
  years,
  value,
  onChange,
  className = "",
}: {
  years: number[];
  value: YearValue;
  onChange: (y: YearValue) => void;
  className?: string;
}) {
  if (years.length < 2) return null;
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      <span className="text-sm text-gray-500">ปี:</span>
      {(["all", ...years] as const).map((y) => (
        <button
          key={y}
          type="button"
          onClick={() => onChange(y)}
          className={`rounded-lg border px-3 py-1 text-sm font-medium transition-colors ${
            value === y ? "border-slate-700 bg-slate-700 text-white" : "border-gray-200 bg-white text-gray-600 hover:border-gray-400"
          }`}
        >
          {y === "all" ? "ทุกปี" : `ปี ${y}`}
        </button>
      ))}
    </div>
  );
}

// ปีที่เลือกไว้ยังมีอยู่ในข้อมูลไหม — ไม่มีแล้วกลับเป็น "ทุกปี"
export function effectiveYear(value: YearValue, years: number[]): YearValue {
  return value !== "all" && years.includes(value) ? value : "all";
}
