import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { preconnect, prefetchDNS } from "react-dom";
import { apiBase } from "@/lib/api";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Invoice OCR Demo — F1",
  description: "Upload + poll invoice-ocr-poc for OCR timeline, result, and runtime config",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const origin = apiBase();
  prefetchDNS(origin);
  preconnect(origin);

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
