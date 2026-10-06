"use client";

import { useRef, useState, useTransition } from "react";
import { Pencil, Trash2, X } from "lucide-react";
import { deleteCategory, renameCategory } from "@/app/actions";
import { inputCls } from "@/components/form-bits";
import { useI18n } from "@/components/i18n-provider";

export function CategoryRow({ name, count }: { name: string; count: number }) {
  const { t } = useI18n();
  const dialog = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState(name);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  function save() {
    start(async () => {
      const res = await renameCategory(name, draft);
      if (res.error) return setError(res.error);
      dialog.current?.close();
    });
  }

  function remove() {
    if (window.confirm(t.categories.deleteConfirm(name, count))) start(() => deleteCategory(name));
  }

  return (
    <li className={`flex items-center gap-2 py-1 pr-0 ${pending ? "opacity-50" : ""}`}>
      <span className="min-w-0 flex-1 truncate font-medium text-ink">{name}</span>
      <span className="shrink-0 text-sm text-muted">{count || "—"}</span>
      <button
        type="button"
        aria-label={t.categories.renameAria(name)}
        onClick={() => {
          setDraft(name);
          setError(undefined);
          dialog.current?.showModal();
        }}
        className="rounded-full p-3 text-muted transition hover:bg-canvas hover:text-ink"
      >
        <Pencil size={16} />
      </button>
      <button type="button" aria-label={t.categories.deleteAria(name)} onClick={remove} className="rounded-full p-3 text-muted transition hover:bg-ember/10 hover:text-ember">
        <Trash2 size={16} />
      </button>

      <dialog
        ref={dialog}
        className="sheet m-0 mt-auto w-full max-w-none rounded-t-large bg-paper p-6 pb-10 text-ink-soft sm:m-auto sm:max-w-md sm:rounded-large sm:pb-6"
        onClick={(e) => e.target === dialog.current && dialog.current?.close()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="heading text-xl">{t.categories.renameTitle}</h2>
          <button type="button" aria-label={t.common.close} onClick={() => dialog.current?.close()} className="rounded-full p-2 hover:bg-canvas">
            <X size={22} />
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (draft.trim()) save();
          }}
        >
          <input autoFocus value={draft} maxLength={40} onChange={(e) => setDraft(e.target.value)} className={inputCls} aria-invalid={!!error} />
          {error && <p className="mt-2 text-sm text-ember">{error}</p>}
          {count > 0 && (
            <p className="mt-2 text-sm text-muted">{t.categories.willChangeIn(count)}</p>
          )}
          <button
            type="submit"
            disabled={!draft.trim() || pending}
            className="mt-5 w-full rounded-full bg-ink px-6 py-3.5 font-medium text-paper transition hover:bg-ink-soft disabled:opacity-50"
          >
            {pending ? t.common.saving : t.common.save}
          </button>
        </form>
      </dialog>
    </li>
  );
}
