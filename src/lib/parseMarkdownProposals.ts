// Pure parser: ไม่แตะ DB, ใช้ได้ทั้ง client/server
// Input: markdown table format จากเอกสารข้อเสนอ + รายการ SubCommittee จากระบบ
// Output: ข้อเสนอที่พร้อม import + warnings

export function thaiToArabic(s: string): string {
  return s.replace(/[๐-๙]/g, (d) =>
    String.fromCharCode(d.charCodeAt(0) - 0xe50 + 0x30)
  );
}

export interface ParsedProposal {
  scNumber: number;
  scId: string | null;
  scLabel: string;
  title: string;
  description: string;
}

export interface ParseResult {
  proposals: ParsedProposal[];
  warnings: string[];
}

function makeTitle(desc: string, max = 70): string {
  if (desc.length <= max) return desc;
  const head = desc.slice(0, max);
  // หาเครื่องหมายจบประโยคแรก (จบ . , เพื่อ อาทิ โดย รวมถึง)
  const stopMatch = head.match(/^([^.,]+?)(?:[.,]| อาทิ| เพื่อ| โดย| รวมถึง)/);
  if (stopMatch && stopMatch[1].length >= 15) return stopMatch[1].trim();
  // ตัดที่ space ใกล้ max ที่สุด
  const lastSpace = head.lastIndexOf(" ");
  if (lastSpace > 30) return head.slice(0, lastSpace).trim() + "...";
  return head.trim() + "...";
}

export function parseMarkdownProposals(
  md: string,
  subCommittees: { id: string; name: string }[]
): ParseResult {
  const warnings: string[] = [];
  const text = thaiToArabic(md);

  // map เลขอนุฯ (1-8) → SubCommittee ที่มีในระบบ ผ่าน prefix "Cn:"
  const scByNum = new Map<number, { id: string; name: string }>();
  for (const sc of subCommittees) {
    const m = sc.name.match(/^C(\d+)/);
    if (m) scByNum.set(Number(m[1]), sc);
  }

  // เก็บเฉพาะบรรทัดที่เป็น table row
  const lines = text.split("\n").map((l) => l.trim());
  const tableLines = lines.filter((l) => l.startsWith("|") && l.endsWith("|"));
  if (tableLines.length === 0) {
    warnings.push("ไม่พบ markdown table ในข้อความที่วาง");
    return { proposals: [], warnings };
  }

  // ข้าม separator (|---|---|) และ header row แรก
  const dataRows: string[] = [];
  let headerSkipped = false;
  for (const line of tableLines) {
    if (/^\|[\s|:-]+\|$/.test(line)) continue;
    if (!headerSkipped) {
      headerSkipped = true;
      continue;
    }
    dataRows.push(line);
  }

  const proposals: ParsedProposal[] = [];

  for (const row of dataRows) {
    const cells = row
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());
    if (cells.length < 2) continue;

    const [colSC, colItems] = cells;
    const cleanSC = colSC.replace(/\*+/g, "").trim();
    const scNumMatch = cleanSC.match(/^(\d+)/);
    if (!scNumMatch) {
      warnings.push(`ไม่พบหมายเลขอนุฯ ในแถว: "${cleanSC.slice(0, 40)}"`);
      continue;
    }
    const scNumber = Number(scNumMatch[1]);
    const sc = scByNum.get(scNumber);
    if (!sc) {
      warnings.push(`อนุฯ ${scNumber} ไม่มีในระบบ — เพิ่มที่แท็บ "อนุกรรมการ" ก่อน`);
    }
    const scLabel = cleanSC.replace(/^\d+[.)]\s*/, "").trim();

    // split ข้อย่อยด้วย <br>
    const items = colItems
      .split(/<br\s*\/?>/gi)
      .map((s) => s.trim())
      .filter(Boolean);

    if (items.length === 0) {
      warnings.push(`อนุฯ ${scNumber}: ไม่พบข้อย่อยในคอลัมน์ที่ 2`);
      continue;
    }

    for (const raw of items) {
      // ตัดเลขนำหน้า "1." "1)"
      const desc = raw.replace(/^\d+[.)]\s*/, "").trim();
      if (!desc) continue;

      proposals.push({
        scNumber,
        scId: sc?.id ?? null,
        scLabel,
        title: makeTitle(desc),
        description: desc,
      });
    }
  }

  return { proposals, warnings };
}
