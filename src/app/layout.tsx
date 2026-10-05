import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { missingConfig } from "@/lib/config";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700", "900"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: { default: "Subskrypcje", template: "%s · Subskrypcje" },
  description: "Moje subskrypcje — ile, kiedy, z jakiej karty.",
  appleWebApp: { capable: true, title: "Subskrypcje", statusBarStyle: "default" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const missing = missingConfig();
  return (
    <html lang="pl" className={inter.variable}>
      <body className="min-h-dvh">{missing.length ? <SetupNeeded missing={missing} /> : children}</body>
    </html>
  );
}

function SetupNeeded({ missing }: { missing: string[] }) {
  return (
    <main className="flex min-h-dvh flex-col justify-center gap-6 bg-forest px-6 py-10 text-paper sm:px-12">
      <h1 className="display text-[56px] text-lime sm:text-[89px]">PRAWIE GOTOWE.</h1>
      <p className="max-w-lg text-mist">Brakuje zmiennych środowiskowych. Ustaw je w Vercel → Settings → Environment Variables i zrób Redeploy:</p>
      <ul className="flex flex-col gap-2">
        {missing.map((m) => (
          <li key={m} className="w-fit rounded-full bg-paper/10 px-4 py-2 font-semibold text-lime">
            {m}
          </li>
        ))}
      </ul>
    </main>
  );
}
