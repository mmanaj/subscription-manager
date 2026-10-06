"use client";

import { useActionState, useState } from "react";
import { deleteAccount } from "@/app/actions";
import { Field, inputCls } from "@/components/form-bits";
import { btn } from "@/components/ui";

export function DeleteAccount({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(deleteAccount, undefined);
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={`${btn.danger} -ml-5 self-start`}>
        Usuń konto…
      </button>
    );
  }
  return (
    <form action={action} className="panel flex flex-col gap-4 p-4">
      <p className="text-sm text-ink">
        Usuniemy na zawsze wszystkie Twoje subskrypcje, karty, konta, kategorie i urządzenia z powiadomieniami. Tego nie da się
        cofnąć — jeśli chcesz zachować dane, najpierw pobierz eksport.
      </p>
      <Field label={`Wpisz ${email}, żeby potwierdzić`} error={state?.fieldErrors?.confirm}>
        <input
          name="confirm"
          type="email"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          required
          aria-invalid={!!state?.fieldErrors?.confirm}
          className={inputCls}
        />
      </Field>
      <div className="flex flex-wrap gap-2">
        <button disabled={pending} className={`${btn.primary} bg-ember hover:bg-ember/90`}>
          {pending ? "Usuwam…" : "Usuń konto na zawsze"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className={btn.secondary}>
          Anuluj
        </button>
      </div>
    </form>
  );
}
