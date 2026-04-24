import type { Metadata } from "next";
import { Sarabun } from "next/font/google";
import NavBar from "@/components/NavBar";
import "./globals.css";

const sarabun = Sarabun({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["thai", "latin"],
  variable: "--font-sarabun",
});

export const metadata: Metadata = {
  title: "ศปถ. ติดตามผลการดำเนินงาน",
  description: "ระบบติดตามผลการดำเนินงานตามข้อเสนอแนวทางของคณะอนุกรรมการ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={`${sarabun.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-gray-50 font-[var(--font-sarabun)]">
        <NavBar />
        <main className="flex-1">{children}</main>
        <footer className="bg-gray-100 border-t text-center text-xs text-gray-500 py-3 px-4">
          ระบบติดตามผลการดำเนินงานของคณะอนุกรรมการในคณะกรรมการศูนย์อำนวยการความปลอดภัยทางถนน
        </footer>
      </body>
    </html>
  );
}
