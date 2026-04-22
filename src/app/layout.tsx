import type { Metadata } from "next";
import { Sarabun } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "next-auth/react";

const sarabun = Sarabun({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["thai", "latin"],
  variable: "--font-sarabun",
});

export const metadata: Metadata = {
  title: "ระบบติดตามข้อเสนอแนวทางฯ | RSAT",
  description: "ระบบติดตามข้อเสนอแนวทางในการป้องกันและลดอุบัติเหตุทางถนนในช่วงการรณรงค์และภายหลังการรณรงค์ป้องกันและลดอุบัติเหตุทางถนน เทศกาล ฯ",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className={`${sarabun.variable} h-full`}>
      <body className="min-h-full flex flex-col font-[var(--font-sarabun)]">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
