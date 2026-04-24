"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Loader2, Send, MessageCircle, CheckCircle2 } from "lucide-react";

interface Message {
  id: string;
  question: string;
  answer: string | null;
  createdAt: string;
}

export function AgencyMessages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState("");
  const [sending, setSending] = useState(false);

  async function load() {
    const res = await fetch("/api/agency/messages");
    setMessages(await res.json());
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    setSending(true);
    await fetch("/api/agency/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    setQuestion("");
    setSending(false);
    load();
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <MessageCircle size={20} className="text-emerald-600" />
          ส่งคำถามถึงแอดมิน
        </h2>
        <p className="text-gray-500 text-sm mt-1">หากมีข้อสงสัยเกี่ยวกับการใช้งานระบบ สามารถส่งคำถามได้ที่นี่</p>
      </div>

      {/* Send form */}
      <Card>
        <CardContent className="pt-4">
          <form onSubmit={handleSend} className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">คำถามของคุณ</label>
              <textarea
                rows={3}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="พิมพ์คำถามหรือข้อสงสัย..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                required
              />
            </div>
            <Button type="submit" size="sm" disabled={sending || !question.trim()}
              className="bg-emerald-600 hover:bg-emerald-700">
              {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              ส่งคำถาม
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* History */}
      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="animate-spin text-emerald-500" size={20} /></div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-600">ประวัติคำถาม ({messages.length})</p>
          {messages.length === 0 && (
            <Card><CardContent className="py-8 text-center text-gray-400 text-sm">ยังไม่มีคำถาม</CardContent></Card>
          )}
          {messages.map((msg) => (
            <Card key={msg.id} className={msg.answer ? "border-l-4 border-l-green-400" : "border-l-4 border-l-yellow-400"}>
              <CardContent className="py-3 space-y-2">
                <p className="text-xs text-gray-400">
                  {new Date(msg.createdAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
                <p className="text-sm text-gray-800 font-medium">{msg.question}</p>
                {msg.answer ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 flex gap-2">
                    <CheckCircle2 size={14} className="text-green-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-green-600 font-medium mb-0.5">คำตอบจากแอดมิน</p>
                      <p className="text-sm text-gray-700">{msg.answer}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-yellow-600">⏳ รอแอดมินตอบกลับ</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
