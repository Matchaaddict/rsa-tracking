"use client";
import { useState, useTransition } from "react";
import { submitResponse, deleteResponse } from "@/actions/response";

interface ResponseFormProps {
  guidelineId: number;
  existingProgress?: string | null;
}

export default function ResponseForm({ guidelineId, existingProgress }: ResponseFormProps) {
  const [text, setText] = useState(existingProgress ?? "");
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(!!existingProgress);
  const [editing, setEditing] = useState(!existingProgress);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    startTransition(async () => {
      await submitResponse(guidelineId, text.trim());
      setSaved(true);
      setEditing(false);
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteResponse(guidelineId);
      setText("");
      setSaved(false);
      setEditing(true);
    });
  }

  if (saved && !editing) {
    return (
      <div className="mt-3">
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{text}</p>
        </div>
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => setEditing(true)}
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            แก้ไข
          </button>
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="text-sm text-red-500 hover:text-red-700 underline"
          >
            ลบ
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        placeholder="กรอกผลการดำเนินงาน..."
        className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-y"
        required
      />
      <div className="flex gap-2 mt-2">
        <button
          type="submit"
          disabled={isPending || !text.trim()}
          className="bg-blue-700 hover:bg-blue-800 disabled:bg-gray-400 text-white px-4 py-2 rounded text-sm transition-colors"
        >
          {isPending ? "กำลังบันทึก..." : "บันทึก"}
        </button>
        {saved && (
          <button
            type="button"
            onClick={() => { setText(existingProgress ?? ""); setEditing(false); }}
            className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm"
          >
            ยกเลิก
          </button>
        )}
      </div>
    </form>
  );
}
