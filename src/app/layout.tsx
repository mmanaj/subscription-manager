import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { missingConfig } from "@/lib/config";
import "./globals.css";

const geist = Geist({
  subsets: ["latin", "latin-ext"],
  variable: "--font-geist",
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
    <html lang="pl" className={geist.variable}>
      <body className="min-h-dvh">{missing.length ? <SetupNeeded missing={missing} /> : children}</body>
    </html>
  );
}

function SetupNeeded({ missing }: { missing: string[] }) {
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h1 className="heading text-2xl">Prawie gotowe</h1>
        <p className="mt-2 text-muted">
          Brakuje zmiennych środowiskowych. Ustaw je w Vercel → Settings → Environment Variables i zrób Redeploy:
        </p>
        <ul className="mt-4 flex flex-col gap-2">
          {missing.map((m) => (
            <li key={m} className="rounded-[var(--radius-field)] bg-canvas px-3 py-2 font-mono text-[13px] text-ink">
              {m}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
