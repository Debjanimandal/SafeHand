import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/lib/context";

export const metadata: Metadata = {
  title: "CivicVault — Verified Access",
  description: "Demo platform showing Proofly wallet verification",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="relative z-10 min-h-screen bg-black text-white">
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
