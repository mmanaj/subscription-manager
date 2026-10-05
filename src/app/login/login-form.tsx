"use client";

import { useActionState } from "react";
import { login } from "@/app/actions";
import { Submit } from "@/components/form-bits";

export function LoginForm() {
  const [state, action] = useActionState(login, undefined);
  return (
    <form action={action} className="mt-10 flex flex-col gap-4">
      <input
        name="password"
        type="password"
        required
        autoFocus
        autoComplete="current-password"
        placeholder="Hasło"
        aria-label="Hasło"
        className="w-full rounded-card border border-mist/40 bg-transparent px-4 py-3.5 text-paper outline-none placeholder:text-mist/60 focus:border-lime"
      />
      {state?.error && <p className="text-sm font-semibold text-lime">{state.error}</p>}
      <Submit>Wejdź</Submit>
    </form>
  );
}
