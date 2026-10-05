"use client";

import { useActionState } from "react";
import { login } from "@/app/actions";
import { inputCls, Submit } from "@/components/form-bits";

export function LoginForm() {
  const [state, action] = useActionState(login, undefined);
  return (
    <form action={action} className="mt-6 flex flex-col gap-3">
      <input
        name="password"
        type="password"
        required
        autoFocus
        autoComplete="current-password"
        placeholder="Hasło"
        aria-label="Hasło"
        aria-invalid={!!state?.error}
        className={inputCls}
      />
      {state?.error && <p className="text-sm text-ember">{state.error}</p>}
      <div className="[&>button]:w-full">
        <Submit>Wejdź</Submit>
      </div>
    </form>
  );
}
