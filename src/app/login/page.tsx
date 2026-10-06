import { getI18n } from "@/lib/i18n/server";
import { LoginForm } from "./login-form";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.login.meta };
}

export default async function LoginPage() {
  const { t } = await getI18n();
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-full bg-ink text-lg font-medium tracking-tight text-paper">
          s.
        </div>
        <h1 className="heading text-2xl">{t.login.title}</h1>
        <p className="mt-1 text-muted">{t.login.subtitle}</p>
        <LoginForm />
      </div>
    </main>
  );
}
