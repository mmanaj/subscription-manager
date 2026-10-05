"use client";

import { useRef, useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { addCategory } from "@/app/actions";
import { inputCls } from "./form-bits";

export function CategoryPicker({ name, initial, options }: { name: string; initial: string | null; options: string[] }) {
  const [list, setList] = useState(() => (initial && !options.includes(initial) ? [...options, initial] : options));
  const [value, setValue] = useState(initial ?? "");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const dialog = useRef<HTMLDialogElement>(null);

  function open() {
    setDraft("");
    setError(undefined);
    dialog.current?.showModal();
  }

  function save() {
    const existing = list.find((c) => c.toLowerCase() === draft.trim().toLowerCase());
    if (existing) {
      setValue(existing);
      dialog.current?.close();
      return;
    }
    start(async () => {
      const res = await addCategory(draft);
      if (res.error || !res.name) return setError(res.error ?? "Nie udało się zapisać");
      setList((l) => [...l.filter((c) => c !== "Inne"), res.name!, ...(l.includes("Inne") ? ["Inne"] : [])]);
      setValue(res.name);
      dialog.current?.close();
    });
  }

  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-sm font-semibold text-obsidian">Kategoria</legend>
      <input type="hidden" name={name} value={value} />
      <div className="flex flex-wrap gap-2">
        {list.map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={value === c}
            onClick={() => setValue(value === c ? "" : c)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              value === c ? "bg-lime text-forest" : "bg-fog text-charcoal hover:bg-mist"
            }`}
          >
            {c}
          </button>
        ))}
        <button
          type="button"
          onClick={open}
          className="inline-flex items-center gap-1 rounded-full border border-forest px-4 py-2 text-sm font-semibold text-forest transition hover:bg-mist"
        >
          <Plus size={16} strokeWidth={2.5} /> Nowa
        </button>
      </div>

      {/* Bottom sheet on mobile, centered card on desktop. Not a <form>: it lives inside the subscription form. */}
      <dialog
        ref={dialog}
        className="m-0 mt-auto w-full max-w-none rounded-t-large bg-paper p-6 pb-10 text-charcoal backdrop:bg-obsidian/50 sm:m-auto sm:max-w-md sm:rounded-large sm:pb-6"
        onClick={(e) => e.target === dialog.current && dialog.current?.close()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="heading text-[28px]">Nowa kategoria</h2>
          <button type="button" aria-label="Zamknij" onClick={() => dialog.current?.close()} className="rounded-full p-2 hover:bg-fog">
            <X size={22} />
          </button>
        </div>
        <input
          autoFocus
          value={draft}
          maxLength={40}
          placeholder="np. Zdrowie"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (draft.trim()) save();
            }
          }}
          className={inputCls}
          aria-invalid={!!error}
        />
        {error && <p className="mt-2 text-sm text-alarm">{error}</p>}
        <button
          type="button"
          disabled={!draft.trim() || pending}
          onClick={save}
          className="mt-5 w-full rounded-full bg-lime px-6 py-3.5 font-semibold text-forest transition hover:brightness-95 disabled:opacity-50"
        >
          {pending ? "Dodaję…" : "Dodaj i wybierz"}
        </button>
      </dialog>
    </fieldset>
  );
}
