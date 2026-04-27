"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Loader2, Send, MessageCircle, CheckCircle2, Megaphone } from "lucide-react";

interface Message {
  id: string;
  question: string;
  answer: string | null;
  direction: "TO_ADMIN" | "FROM_ADMIN";
  readByAgency: boolean;
  createdAt: string;
}

function formatThaiDateTime(iso: string) {
  return new Date(iso).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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

  useEffect(() => {
    load();
    // Mark FROM_ADMIN messages as read once the agency opens this tab.
    fetch("/api/agency/messages/read", { method: "POST" }).catch(() => {});
  }, []);

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

  const fromAdmin = messages.filter((m) => m.direction === "FROM_ADMIN");
  const myQuestions = messages.filter((m) => m.direction !== "FROM_ADMIN");

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <MessageCircle size={20} className="text-emerald-600" />
          ข้อความ
        </h2>
        <p className="text-gray-500 text-sm mt-1">
          แจ้งจากแอดมิน + คำถามของคุณ
        </p>
      </div>

      {/* Admin announcements */}
      {fromAdmin.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-blue-700 flex items-center gap-1.5">
            <Megaphone size={14} /> แจ้งจากแอดมิน ({fromAdmin.length})
          </p>
          {fromAdmin.map((msg) => (
            <Card
              key={msg.id}
              className={`border-l-4 ${msg.readByAgency ? "border-l-blue-300 opacity-80" : "border-l-blue-500"}`}
            >
              <CardContent className="py-3 space-y-2">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Megaphone size={12} className="text-blue-500" />
                  <span className="font-medium text-blue-600">แอดมิน</span>
                  <span>·</span>
                  <span>{formatThaiDateTime(msg.createdAt)}</span>
                  {!msg.readByAgency && (
                    <span className="ml-auto bg-blue-500 text-white text-[10px] font-semibold rounded-full px-2 py-0.5">
                      ใหม่
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">{msg.question}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Send question to admin */}
      <Card>
        <CardContent className="pt-4">
          <form onSubmit={handleSend} className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">ส่งคำถามถึงแอดมิน</label>
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

      {/* History of questions */}
      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="animate-spin text-emerald-500" size={20} /></div>
      ) : myQuestions.length > 0 ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-600">ประวัติคำถามของคุณ ({myQuestions.length})</p>
          {myQuestions.map((msg) => (
            <Card key={msg.id} className={msg.answer ? "border-l-4 border-l-green-400" : "border-l-4 border-l-yellow-400"}>
              <CardContent className="py-3 space-y-2">
                <p className="text-xs text-gray-400">{formatThaiDateTime(msg.createdAt)}</p>
                <p className="text-sm text-gray-800 font-medium">{msg.question}</p>
                {msg.answer ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 flex gap-2">
                    <CheckCircle2 size={14} className="text-green-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-green-600 font-medium mb-0.5">คำตอบจากแอดมิน</p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">{msg.answer}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-yellow-600">⏳ รอแอดมินตอบกลับ</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}
