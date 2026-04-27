"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Loader2, Check, MessageCircle, Building2, X, Megaphone, Send, Search, Users } from "lucide-react";

interface Message {
  id: string;
  question: string;
  answer: string | null;
  direction: "TO_ADMIN" | "FROM_ADMIN";
  readByAdmin: boolean;
  readByAgency: boolean;
  createdAt: string;
  agency: { name: string };
}

interface AgencyOption {
  id: string;
  name: string;
  subCommittees: { subCommittee: { id: string; name: string } }[];
}

interface SubCommitteeOption {
  id: string;
  name: string;
}

function formatThaiDate(iso: string) {
  return new Date(iso).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function MessagesManager({ onReply }: { onReply?: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyId, setReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<"inbox" | "compose">("inbox");

  async function load() {
    const res = await fetch("/api/admin/messages");
    setMessages(await res.json());
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function handleReply(id: string) {
    if (!replyText.trim()) return;
    setSaving(true);
    await fetch(`/api/admin/messages/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answer: replyText }),
    });
    setReplyId(null);
    setReplyText("");
    setSaving(false);
    load();
    onReply?.();
  }

  const inbox = messages.filter((m) => m.direction !== "FROM_ADMIN");
  const sent = messages.filter((m) => m.direction === "FROM_ADMIN");
  const unanswered = inbox.filter((m) => !m.answer);
  const answered = inbox.filter((m) => m.answer);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <MessageCircle size={18} /> ข้อความ
          </h2>
          <p className="text-sm text-gray-500 mt-1">รับคำถามจากหน่วยงาน + ส่งประกาศถึงหน่วยงาน</p>
        </div>
        <div className="flex border border-gray-200 rounded-lg overflow-hidden text-sm">
          <button
            onClick={() => setView("inbox")}
            className={`px-3 py-1.5 flex items-center gap-1.5 ${view === "inbox" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
          >
            <MessageCircle size={13} /> กล่องคำถาม ({inbox.length})
          </button>
          <button
            onClick={() => setView("compose")}
            className={`px-3 py-1.5 flex items-center gap-1.5 border-l border-gray-200 ${view === "compose" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
          >
            <Megaphone size={13} /> ส่งประกาศ
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-blue-500" size={22} /></div>
      ) : view === "compose" ? (
        <ComposeAnnouncement onSent={load} sentMessages={sent} />
      ) : (
        <>
          {/* Unanswered */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-red-600">
              รอตอบกลับ ({unanswered.length})
            </p>
            {unanswered.length === 0 && (
              <Card><CardContent className="py-6 text-center text-gray-400 text-sm">ไม่มีคำถามที่รอตอบ</CardContent></Card>
            )}
            {unanswered.map((msg) => (
              <Card key={msg.id} className="border-l-4 border-l-red-400">
                <CardContent className="py-3 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Building2 size={12} />
                    <span className="font-medium text-gray-600">{msg.agency.name}</span>
                    <span>·</span>
                    <span>{formatThaiDate(msg.createdAt)}</span>
                  </div>
                  <p className="text-sm text-gray-800 font-medium">{msg.question}</p>

                  {replyId === msg.id ? (
                    <div className="space-y-2 pt-1">
                      <textarea
                        rows={3}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="พิมพ์คำตอบ..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleReply(msg.id)} disabled={saving || !replyText.trim()}>
                          {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                          ส่งคำตอบ
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => { setReplyId(null); setReplyText(""); }}>
                          <X size={13} /> ยกเลิก
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button size="sm" variant="secondary" onClick={() => { setReplyId(msg.id); setReplyText(""); }}>
                      ตอบกลับ
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Answered */}
          {answered.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-green-600">ตอบแล้ว ({answered.length})</p>
              {answered.map((msg) => (
                <Card key={msg.id} className="border-l-4 border-l-green-400 opacity-80">
                  <CardContent className="py-3 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Building2 size={12} />
                      <span className="font-medium text-gray-600">{msg.agency.name}</span>
                      <span>·</span>
                      <span>{formatThaiDate(msg.createdAt)}</span>
                    </div>
                    <p className="text-sm text-gray-700">{msg.question}</p>
                    <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                      <p className="text-xs text-green-600 font-medium mb-0.5">คำตอบของแอดมิน</p>
                      <p className="text-sm text-gray-700">{msg.answer}</p>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => { setReplyId(msg.id); setReplyText(msg.answer || ""); }}>
                      แก้ไขคำตอบ
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ComposeAnnouncement({
  onSent,
  sentMessages,
}: {
  onSent: () => void;
  sentMessages: Message[];
}) {
  const [agencies, setAgencies] = useState<AgencyOption[]>([]);
  const [subs, setSubs] = useState<SubCommitteeOption[]>([]);
  const [body, setBody] = useState("");
  const [scFilter, setScFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/agencies").then((r) => r.json()),
      fetch("/api/admin/subcommittees").then((r) => r.json()),
    ]).then(([a, s]) => {
      setAgencies(a);
      setSubs(s);
    });
  }, []);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return agencies.filter((a) => {
      if (scFilter !== "all") {
        if (!a.subCommittees.some((sc) => sc.subCommittee.id === scFilter)) return false;
      }
      if (q && !a.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [agencies, scFilter, search]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      visible.forEach((a) => next.add(a.id));
      return next;
    });
  }

  function clearAll() {
    setSelected(new Set());
  }

  async function handleSend() {
    if (!body.trim() || selected.size === 0) return;
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agencyIds: Array.from(selected), body }),
      });
      if (!res.ok) throw new Error("send failed");
      const data = await res.json();
      setResult(`ส่งแล้ว ${data.count} หน่วยงาน`);
      setBody("");
      setSelected(new Set());
      onSent();
    } catch {
      setResult("ส่งไม่สำเร็จ ลองอีกครั้ง");
    } finally {
      setSending(false);
    }
  }

  const canSend = body.trim().length > 0 && selected.size > 0 && !sending;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">ข้อความถึงหน่วยงาน</label>
            <textarea
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="เช่น ขอความร่วมมือทุกหน่วยส่งรายงานภายในวันที่ 15 พ.ค. 68 ตามมติที่ประชุม..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
              <p className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                <Users size={14} /> เลือกหน่วยงานปลายทาง
                <span className="text-xs font-normal text-blue-600">เลือกแล้ว {selected.size} หน่วย</span>
              </p>
              <div className="flex gap-1.5">
                <Button size="sm" variant="secondary" onClick={selectAllVisible} disabled={visible.length === 0}>
                  เลือกทั้งหมดที่แสดง ({visible.length})
                </Button>
                {selected.size > 0 && (
                  <Button size="sm" variant="ghost" onClick={clearAll}>
                    ล้าง
                  </Button>
                )}
              </div>
            </div>

            <div className="flex gap-2 flex-wrap mb-2">
              <select
                value={scFilter}
                onChange={(e) => setScFilter(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">ทุกอนุฯ</option>
                {subs.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <div className="relative flex-1 min-w-[180px]">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ค้นหาชื่อหน่วยงาน..."
                  className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto divide-y divide-gray-100">
              {visible.length === 0 ? (
                <p className="px-3 py-6 text-sm text-gray-400 text-center">ไม่พบหน่วยงาน</p>
              ) : (
                visible.map((a) => (
                  <label
                    key={a.id}
                    className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(a.id)}
                      onChange={() => toggle(a.id)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{a.name}</span>
                    <span className="ml-auto text-xs text-gray-400">
                      {a.subCommittees.map((sc) => sc.subCommittee.name).join(", ")}
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button size="sm" onClick={handleSend} disabled={!canSend}>
              {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              ส่งให้ {selected.size} หน่วยงาน
            </Button>
            {result && (
              <span className={`text-xs ${result.startsWith("ส่งแล้ว") ? "text-emerald-600" : "text-red-500"}`}>
                {result}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {sentMessages.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-600">ประกาศที่ส่งแล้ว ({sentMessages.length})</p>
          {sentMessages.slice(0, 20).map((m) => (
            <Card key={m.id} className={`border-l-4 ${m.readByAgency ? "border-l-blue-300" : "border-l-blue-500"}`}>
              <CardContent className="py-2.5 space-y-1">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Building2 size={12} />
                  <span className="font-medium text-gray-600">{m.agency.name}</span>
                  <span>·</span>
                  <span>{formatThaiDate(m.createdAt)}</span>
                  <span className={`ml-auto text-[10px] font-medium ${m.readByAgency ? "text-gray-400" : "text-blue-600"}`}>
                    {m.readByAgency ? "อ่านแล้ว" : "ยังไม่ได้อ่าน"}
                  </span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">{m.question}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
