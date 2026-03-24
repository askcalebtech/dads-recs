import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: { default: "Dad's Recs", template: "%s | Dad's Recs" },
  description: "Every movie Dad has seen — search, browse, and discover what he thought.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} dark`}>
      <body className="bg-background text-foreground antialiased min-h-screen">
        <Header />
        <main>{children}</main>
      </body>
    </html>
  );
}
