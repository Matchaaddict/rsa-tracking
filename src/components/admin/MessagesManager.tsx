"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Loader2, Check, MessageCircle, Building2, X } from "lucide-react";

interface Message {
  id: string;
  question: string;
  answer: string | null;
  readByAdmin: boolean;
  createdAt: string;
  agency: { name: string };
}

export function MessagesManager({ onReply }: { onReply?: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyId, setReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [saving, setSaving] = useState(false);

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

  const unanswered = messages.filter((m) => !m.answer);
  const answered = messages.filter((m) => m.answer);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <MessageCircle size={18} /> กล่องข้อความจากหน่วยงาน
        </h2>
        <p className="text-sm text-gray-500 mt-1">คำถามจากหน่วยงานที่ต้องการความช่วยเหลือ</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-blue-500" size={22} /></div>
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
                    <span>{new Date(msg.createdAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}</span>
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
                      <span>{new Date(msg.createdAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}</span>
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
