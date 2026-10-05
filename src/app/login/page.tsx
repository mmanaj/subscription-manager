import { LoginForm } from "./login-form";

export const metadata = { title: "Logowanie" };

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col justify-between bg-forest px-6 py-10 text-paper sm:px-12">
      <span className="text-[26px] font-black tracking-[-0.06em] text-lime">subs.</span>
      <div className="mx-auto w-full max-w-md">
        <h1 className="display text-[72px] text-lime sm:text-[105px]">
          ILE
          <br />
          PŁACĘ?
        </h1>
        <LoginForm />
      </div>
      <span className="text-sm text-mist/60">Prywatne. Tylko dla właściciela.</span>
    </main>
  );
}
