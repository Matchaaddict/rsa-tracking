// Pure parser: ไม่แตะ DB, ใช้ได้ทั้ง client/server
// รองรับ 2 รูปแบบ:
//   1) Heading style:  "## คำถาม" หรือ "### คำถาม" ตามด้วยคำตอบหลายบรรทัด
//   2) Q/A style:      "Q: คำถาม"  ตามด้วย  "A: คำตอบ"  (รองรับ "ถาม:" / "ตอบ:" ด้วย)

export interface ParsedFAQ {
  question: string;
  answer: string;
}

export interface ParseFAQResult {
  faqs: ParsedFAQ[];
  warnings: string[];
}

const HEADING_RE = /^(#{1,6})\s+(.+?)\s*$/;
const Q_RE = /^(?:Q|q|ถาม|ข้อ)\s*[:：.)]\s*(.+)$/;
const A_RE = /^(?:A|a|ตอบ|คำตอบ)\s*[:：.)]\s*(.+)$/;

function clean(s: string): string {
  return s
    .replace(/\*\*/g, "")
    .replace(/^#+\s*/, "")
    .replace(/^\d+[.)]\s*/, "")
    .trim();
}

export function parseMarkdownFAQs(md: string): ParseFAQResult {
  const warnings: string[] = [];
  const lines = md.replace(/\r\n/g, "\n").split("\n");

  // ตรวจว่าใช้ style ไหน
  const hasHeading = lines.some((l) => HEADING_RE.test(l));
  const hasQA = lines.some((l) => Q_RE.test(l));

  const faqs: ParsedFAQ[] = [];

  if (hasHeading) {
    let curQ: string | null = null;
    let buf: string[] = [];

    const flush = () => {
      if (curQ === null) return;
      const answer = buf.join("\n").replace(/\n{3,}/g, "\n\n").trim();
      if (!answer) {
        warnings.push(`คำถาม "${curQ.slice(0, 40)}" ไม่มีคำตอบ — ข้าม`);
      } else {
        faqs.push({ question: curQ, answer });
      }
      curQ = null;
      buf = [];
    };

    for (const raw of lines) {
      const m = raw.match(HEADING_RE);
      if (m) {
        flush();
        curQ = clean(m[2]);
      } else if (curQ !== null) {
        buf.push(raw);
      }
    }
    flush();
  } else if (hasQA) {
    let curQ: string | null = null;
    let buf: string[] = [];
    let inAnswer = false;

    const flush = () => {
      if (curQ === null) return;
      const answer = buf.join("\n").replace(/\n{3,}/g, "\n\n").trim();
      if (!answer) {
        warnings.push(`คำถาม "${curQ.slice(0, 40)}" ไม่มีคำตอบ — ข้าม`);
      } else {
        faqs.push({ question: curQ, answer });
      }
      curQ = null;
      buf = [];
      inAnswer = false;
    };

    for (const raw of lines) {
      const qm = raw.match(Q_RE);
      const am = raw.match(A_RE);
      if (qm) {
        flush();
        curQ = clean(qm[1]);
        inAnswer = false;
      } else if (am && curQ !== null) {
        buf.push(am[1]);
        inAnswer = true;
      } else if (inAnswer && curQ !== null) {
        buf.push(raw);
      }
    }
    flush();
  } else {
    warnings.push(
      "ไม่พบรูปแบบที่รองรับ — ใช้ ## หัวข้อคำถาม หรือ Q: ... / A: ... ตามด้วยคำตอบ"
    );
  }

  // กันคำตอบที่อาจมี trailing horizontal rule "---"
  for (const f of faqs) {
    f.answer = f.answer.replace(/\n?-{3,}\s*$/g, "").trim();
  }

  return { faqs, warnings };
}
