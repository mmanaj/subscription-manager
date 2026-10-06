"use client";

import { useActionState } from "react";
import { login } from "@/app/actions";
import { inputCls, Submit } from "@/components/form-bits";
import { useI18n } from "@/components/i18n-provider";

export function LoginForm() {
  const { t } = useI18n();
  const [state, action] = useActionState(login, undefined);
  return (
    <form action={action} className="mt-6 flex flex-col gap-3">
      <input
        name="password"
        type="password"
        required
        autoFocus
        autoComplete="current-password"
        placeholder={t.login.password}
        aria-label={t.login.password}
        aria-invalid={!!state?.error}
        className={inputCls}
      />
      {state?.error && <p className="text-sm text-ember">{state.error}</p>}
      <div className="[&>button]:w-full">
        <Submit>{t.login.enter}</Submit>
      </div>
    </form>
  );
}
