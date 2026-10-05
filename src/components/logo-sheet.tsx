"use client";

import { useRef, useState, useTransition } from "react";
import { ImageUp, RefreshCw, X } from "lucide-react";
import { resetLogo, setLogoDomain, uploadLogo } from "@/app/actions";
import type { Logo } from "@/lib/data";
import { inputCls } from "./form-bits";
import { Avatar } from "./ui";

/** Downscales any picked image to a 160×160 PNG in the browser before upload. */
async function toSquarePng(file: File): Promise<string> {
  const img = await createImageBitmap(file);
  const size = 160;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const scale = Math.max(size / img.width, size / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
  return canvas.toDataURL("image/png");
}

export function LogoSheet({
  id,
  name,
  color,
  logo,
  domain,
  overridden,
}: {
  id: number;
  name: string;
  color: string;
  logo: Logo | null;
  domain: string | null;
  /** Logo was set by hand (own upload, chosen site or monogram) */
  overridden: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(domain ?? "");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<{ error?: string }>) =>
    start(async () => {
      setError(undefined);
      const res = await fn();
      if (res.error) setError(res.error);
      else dialog.current?.close();
    });

  return (
    <>
      <button
        type="button"
        aria-label="Zmień logo"
        onClick={() => {
          setDraft(domain ?? "");
          setError(undefined);
          dialog.current?.showModal();
        }}
        className="shrink-0 rounded-full transition active:scale-95"
      >
        <Avatar name={name} color={color} logo={logo} size={64} />
      </button>

      <dialog
        ref={dialog}
        className="sheet m-0 mt-auto w-full max-w-none rounded-t-large bg-paper p-6 pb-10 text-charcoal sm:m-auto sm:max-w-md sm:rounded-large sm:pb-6"
        onClick={(e) => e.target === dialog.current && dialog.current?.close()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="heading text-[28px]">Logo</h2>
          <button type="button" aria-label="Zamknij" onClick={() => dialog.current?.close()} className="rounded-full p-2 hover:bg-fog">
            <X size={22} />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(() => setLogoDomain(id, draft));
          }}
          className="flex flex-col gap-2"
        >
          <label className="text-sm font-semibold text-obsidian" htmlFor={`logo-domain-${id}`}>
            Strona serwisu
          </label>
          <div className="flex gap-2">
            <input
              id={`logo-domain-${id}`}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="np. skyshowtime.com"
              inputMode="url"
              autoCapitalize="off"
              autoCorrect="off"
              className={inputCls}
            />
            <button
              type="submit"
              disabled={pending || !draft.trim()}
              className="shrink-0 rounded-full bg-lime px-5 font-semibold text-forest transition hover:brightness-95 disabled:opacity-50"
            >
              {pending ? "…" : "Pobierz"}
            </button>
          </div>
          <p className="text-xs text-slate">Pobiorę ikonę z tej strony i zapiszę ją u Ciebie.</p>
        </form>

        {error && <p className="mt-3 text-sm font-semibold text-alarm">{error}</p>}

        <div className="mt-6 flex flex-col gap-2">
          <input
            ref={file}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              try {
                const png = await toSquarePng(f);
                run(() => uploadLogo(id, png));
              } catch {
                setError("Nie udało się wczytać obrazka");
              }
            }}
          />
          <button
            type="button"
            disabled={pending}
            onClick={() => file.current?.click()}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-forest px-6 py-3 font-semibold text-forest transition hover:bg-mist disabled:opacity-50"
          >
            <ImageUp size={18} /> Wgraj własny obrazek
          </button>
          {overridden && (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => resetLogo(id, "auto"))}
              className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-semibold text-forest transition hover:bg-mist disabled:opacity-50"
            >
              <RefreshCw size={18} /> Wróć do automatycznego
            </button>
          )}
          {logo && (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => resetLogo(id, "monogram"))}
              className="py-2 text-sm font-semibold text-slate underline underline-offset-4"
            >
              Bez logo — pokaż literę
            </button>
          )}
        </div>
      </dialog>
    </>
  );
}
