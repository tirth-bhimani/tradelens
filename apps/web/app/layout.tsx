import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { IdleSessionTimeout } from "@/components/auth/idle-session-timeout";

export const metadata: Metadata = {
  title: "TradeLens | Behavioral Trade Journal & Rule Backtester",
  description: "Identify trading behavior leaks and replay rules on your past trades.",
  icons: {
    icon: [
      { url: "/brand/icon-square-light.png", media: "(prefers-color-scheme: light)" },
      { url: "/brand/icon-square-dark.png", media: "(prefers-color-scheme: dark)" },
      { url: "/favicon.ico" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <body
        className="min-h-screen antialiased bg-white text-slate-900 dark:bg-[#0b0f19] dark:text-slate-100 selection:bg-blue-600 selection:text-white transition-colors duration-200"
        suppressHydrationWarning
      >
        {/* Anti-FOUC inline script to immediately apply theme before paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function() {
              try {
                var theme = localStorage.getItem('theme');
                var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (theme === 'dark' || (!theme && prefersDark)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (e) {}
            })()`,
          }}
        />
        <ThemeProvider>
          {children}
          {/* Automatic inactivity timeout active across the entire application */}
          <IdleSessionTimeout />
        </ThemeProvider>
      </body>
    </html>
  );
}
