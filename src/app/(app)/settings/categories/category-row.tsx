"use client";

import { useRef, useState, useTransition } from "react";
import { Pencil, Trash2, X } from "lucide-react";
import { deleteCategory, renameCategory } from "@/app/actions";
import { inputCls } from "@/components/form-bits";
import { plural } from "@/lib/billing";

export function CategoryRow({ name, count }: { name: string; count: number }) {
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
    const msg = count
      ? `Usunąć „${name}”? ${count} ${plural(count, ["subskrypcja zostanie", "subskrypcje zostaną", "subskrypcji zostanie"])} bez kategorii.`
      : `Usunąć „${name}”?`;
    if (window.confirm(msg)) start(() => deleteCategory(name));
  }

  return (
    <li className={`flex items-center gap-2 py-1 pl-4 pr-1 ${pending ? "opacity-50" : ""}`}>
      <span className="min-w-0 flex-1 truncate font-semibold text-obsidian">{name}</span>
      <span className="shrink-0 text-sm text-pebble">{count || "—"}</span>
      <button
        type="button"
        aria-label={`Zmień nazwę: ${name}`}
        onClick={() => {
          setDraft(name);
          setError(undefined);
          dialog.current?.showModal();
        }}
        className="rounded-full p-3 text-forest hover:bg-mist"
      >
        <Pencil size={18} />
      </button>
      <button type="button" aria-label={`Usuń: ${name}`} onClick={remove} className="rounded-full p-3 text-alarm hover:bg-alarm/10">
        <Trash2 size={18} />
      </button>

      <dialog
        ref={dialog}
        className="m-0 mt-auto w-full max-w-none rounded-t-large bg-paper p-6 pb-10 text-charcoal backdrop:bg-obsidian/50 sm:m-auto sm:max-w-md sm:rounded-large sm:pb-6"
        onClick={(e) => e.target === dialog.current && dialog.current?.close()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="heading text-[28px]">Zmień nazwę</h2>
          <button type="button" aria-label="Zamknij" onClick={() => dialog.current?.close()} className="rounded-full p-2 hover:bg-fog">
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
          {error && <p className="mt-2 text-sm text-alarm">{error}</p>}
          {count > 0 && (
            <p className="mt-2 text-sm text-slate">
              Zmieni się też w {count} {plural(count, ["subskrypcji", "subskrypcjach", "subskrypcjach"])}.
            </p>
          )}
          <button
            type="submit"
            disabled={!draft.trim() || pending}
            className="mt-5 w-full rounded-full bg-lime px-6 py-3.5 font-semibold text-forest transition hover:brightness-95 disabled:opacity-50"
          >
            {pending ? "Zapisuję…" : "Zapisz"}
          </button>
        </form>
      </dialog>
    </li>
  );
}
