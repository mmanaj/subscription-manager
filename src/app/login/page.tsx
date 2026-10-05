import { LoginForm } from "./login-form";

export const metadata = { title: "Logowanie" };

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <div className="card w-full max-w-sm p-6 sm:p-8">
        <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-full bg-ink text-lg font-medium tracking-tight text-paper">
          s.
        </div>
        <h1 className="heading text-2xl">Zaloguj się</h1>
        <p className="mt-1 text-muted">Prywatne subskrypcje. Tylko dla właściciela.</p>
        <LoginForm />
      </div>
    </main>
  );
}
