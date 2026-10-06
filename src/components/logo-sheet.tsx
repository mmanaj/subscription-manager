"use client";

import { useRef, useState, useTransition } from "react";
import { ImageUp, RefreshCw, X } from "lucide-react";
import { resetLogo, setLogoDomain, uploadLogo } from "@/app/actions";
import type { Logo } from "@/lib/data";
import { inputCls } from "./form-bits";
import { useI18n } from "./i18n-provider";
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
  const { t } = useI18n();
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
        aria-label={t.logo.change}
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
        className="sheet m-0 mt-auto w-full max-w-none rounded-t-large bg-paper p-6 pb-10 text-ink-soft sm:m-auto sm:max-w-md sm:rounded-large sm:pb-6"
        onClick={(e) => e.target === dialog.current && dialog.current?.close()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="heading text-xl">{t.logo.title}</h2>
          <button type="button" aria-label={t.common.close} onClick={() => dialog.current?.close()} className="rounded-full p-2 hover:bg-canvas">
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
          <label className="text-sm font-medium text-ink" htmlFor={`logo-domain-${id}`}>
            {t.logo.site}
          </label>
          <div className="flex gap-2">
            <input
              id={`logo-domain-${id}`}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t.logo.sitePh}
              inputMode="url"
              autoCapitalize="off"
              autoCorrect="off"
              className={inputCls}
            />
            <button
              type="submit"
              disabled={pending || !draft.trim()}
              className="shrink-0 rounded-full bg-ink px-5 font-medium text-paper transition hover:bg-ink-soft disabled:opacity-50"
            >
              {pending ? "…" : t.logo.fetch}
            </button>
          </div>
          <p className="text-xs text-muted">{t.logo.siteHint}</p>
        </form>

        {error && <p className="mt-3 text-sm font-medium text-ember">{error}</p>}

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
                setError(t.logo.loadFailed);
              }
            }}
          />
          <button
            type="button"
            disabled={pending}
            onClick={() => file.current?.click()}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-ink px-6 py-3 font-medium text-ink transition hover:bg-canvas disabled:opacity-50"
          >
            <ImageUp size={18} /> {t.logo.upload}
          </button>
          {overridden && (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => resetLogo(id, "auto"))}
              className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-medium text-ink transition hover:bg-canvas disabled:opacity-50"
            >
              <RefreshCw size={18} /> {t.logo.auto}
            </button>
          )}
          {logo && (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => resetLogo(id, "monogram"))}
              className="py-2 text-sm font-medium text-muted underline underline-offset-4"
            >
              {t.logo.monogram}
            </button>
          )}
        </div>
      </dialog>
    </>
  );
}
