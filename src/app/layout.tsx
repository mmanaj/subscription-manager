import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { I18nProvider } from "@/components/i18n-provider";
import { missingConfig } from "@/lib/config";
import type { Dict } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";
import "./globals.css";

const geist = Geist({
  subsets: ["latin", "latin-ext"],
  variable: "--font-geist",
});

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: { default: t.appName, template: `%s · ${t.appName}` },
    description: t.appDescription,
    appleWebApp: { capable: true, title: t.appName, statusBarStyle: "default" },
    robots: { index: false, follow: false },
  };
}

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const missing = missingConfig();
  const { locale, t } = await getI18n();
  return (
    <html lang={locale} className={geist.variable}>
      <body className="min-h-dvh">
        <I18nProvider locale={locale}>{missing.length ? <SetupNeeded missing={missing} t={t} /> : children}</I18nProvider>
      </body>
    </html>
  );
}

function SetupNeeded({ missing, t }: { missing: ReturnType<typeof missingConfig>; t: Dict }) {
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h1 className="heading text-2xl">{t.setup.title}</h1>
        <p className="mt-2 text-muted">{t.setup.body}</p>
        <ul className="mt-4 flex flex-col gap-2">
          {missing.map((m) => (
            <li key={m.name} className="rounded-[var(--radius-field)] bg-canvas px-3 py-2 font-mono text-[13px] text-ink">
              {m.name}
              {m.note && ` (${t.setup[m.note]})`}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
