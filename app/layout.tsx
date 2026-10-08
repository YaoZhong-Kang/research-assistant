import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "研智助手",
  description: "AI 辅助大学生科研平台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
    <body>
      <div className="flex min-h-screen flex-col">

        <Navbar />

        <div className="flex-1">
          {children}
        </div>

        <Footer />

      </div>
    </body>
    </html>
  );
}