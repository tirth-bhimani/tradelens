import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TradeLens | Behavioral Trade Journal & Rule Backtester",
  description: "Identify trading behavior leaks and replay rules on your past trades.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased bg-slate-950 text-slate-100">
        {children}
      </body>
    </html>
  );
}
