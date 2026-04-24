"use client";

import { useEffect, useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

interface FAQ {
  id: string;
  question: string;
  answer: string;
}

export function FAQSection() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/public/faqs")
      .then((r) => r.json())
      .then((d) => setFaqs(Array.isArray(d) ? d : []));
  }, []);

  if (faqs.length === 0) return null;

  return (
    <section className="bg-white border-t border-gray-100 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <HelpCircle size={20} className="text-blue-600" />
          <h2 className="text-lg font-bold text-gray-800">คำถามที่พบบ่อย (FAQ)</h2>
        </div>
        <div className="space-y-2">
          {faqs.map((faq) => (
            <div key={faq.id} className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setOpen(open === faq.id ? null : faq.id)}
                className="w-full flex items-center justify-between px-5 py-4 text-left text-sm font-medium text-gray-800 hover:bg-gray-50 transition-colors"
              >
                <span>{faq.question}</span>
                <ChevronDown
                  size={16}
                  className={`shrink-0 ml-3 text-gray-400 transition-transform duration-200 ${open === faq.id ? "rotate-180" : ""}`}
                />
              </button>
              {open === faq.id && (
                <div className="px-5 pb-4 text-sm text-gray-600 leading-relaxed border-t border-gray-100 bg-gray-50">
                  <div className="pt-3 whitespace-pre-wrap">{faq.answer}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
