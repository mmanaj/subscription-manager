"use client";

import { useEffect, useState, useTransition } from "react";
import { BellRing, Send, Smartphone } from "lucide-react";
import { removePushDevice, savePushSubscription, sendTestPush } from "@/app/actions";
import { btn } from "@/components/ui";

type State = "loading" | "unsupported" | "ios-install" | "denied" | "off" | "on";

function base64ToBytes(b64: string) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function deviceLabel() {
  const ua = navigator.userAgent;
  const os = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? "Android" : /Mac/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : "Urządzenie";
  const browser = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "";
  return [os, browser].filter(Boolean).join(" · ");
}

export function PushDevice({ publicKey }: { publicKey: string }) {
  const [state, setState] = useState<State>("loading");
  const [msg, setMsg] = useState<string>();
  const [pending, start] = useTransition();

  useEffect(() => {
    (async () => {
      const ios = /iPhone|iPad/.test(navigator.userAgent);
      const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        return setState(ios && !standalone ? "ios-install" : "unsupported");
      }
      if (Notification.permission === "denied") return setState("denied");
      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        // Keep the server copy fresh (push services rotate endpoints now and then).
        await savePushSubscription(sub.toJSON(), deviceLabel());
        setState("on");
      } else setState("off");
    })().catch(() => setState("unsupported"));
  }, []);

  const enable = () =>
    start(async () => {
      setMsg(undefined);
      try {
        const perm = await Notification.requestPermission();
        if (perm !== "granted") return setState(perm === "denied" ? "denied" : "off");
        await navigator.serviceWorker.register("/sw.js");
        const reg = await navigator.serviceWorker.ready;
        // A stale subscription made with an old key would make subscribe() fail — drop it first.
        await (await reg.pushManager.getSubscription())?.unsubscribe();
        const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64ToBytes(publicKey) });
        const res = await savePushSubscription(sub.toJSON(), deviceLabel());
        if (res.error) return setMsg(res.error);
        setState("on");
      } catch (e) {
        setMsg(`Nie udało się włączyć: ${(e as Error).message || e}`);
      }
    });

  const disable = () =>
    start(async () => {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await removePushDevice(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
    });

  const test = () =>
    start(async () => {
      const res = await sendTestPush();
      const head = res.error ?? `Wysłano na ${res.sent} ${res.sent === 1 ? "urządzenie" : "urządzenia"}. Jeśli nic nie przyszło, sprawdź tryb skupienia i ustawienia powiadomień aplikacji.`;
      setMsg([head, ...(res.details ?? [])].join("\n"));
    });

  return (
    <div className="panel flex flex-col gap-3 p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-paper text-ink shadow-hairline">
          {state === "on" ? <BellRing size={18} strokeWidth={1.75} /> : <Smartphone size={18} strokeWidth={1.75} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-ink">
            {state === "on"
              ? "Włączone na tym urządzeniu"
              : state === "loading"
                ? "Sprawdzam…"
                : state === "denied"
                  ? "Powiadomienia zablokowane"
                  : state === "ios-install"
                    ? "Najpierw dodaj aplikację do ekranu"
                    : state === "unsupported"
                      ? "Ta przeglądarka nie obsługuje powiadomień"
                      : "Wyłączone na tym urządzeniu"}
          </p>
          <p className="mt-0.5 text-sm text-muted">
            {state === "ios-install"
              ? "Na iPhonie powiadomienia działają tylko z ekranu początkowego: w Safari stuknij Udostępnij → Do ekranu początkowego, otwórz aplikację z ikony i wróć tutaj."
              : state === "denied"
                ? "Zezwól na powiadomienia dla tej strony w ustawieniach przeglądarki lub telefonu, potem odśwież."
                : state === "on"
                  ? "Przypomnienia przyjdą tutaj. Możesz włączyć je na kilku urządzeniach."
                  : state === "off"
                    ? "Włącz, żeby dostawać przypomnienia o płatnościach na ten telefon lub komputer."
                    : ""}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {state === "off" && (
          <button type="button" onClick={enable} disabled={pending} className={btn.primary}>
            <BellRing size={16} /> Włącz powiadomienia
          </button>
        )}
        {state === "on" && (
          <>
            <button type="button" onClick={test} disabled={pending} className={btn.primary}>
              <Send size={16} /> Wyślij testowe
            </button>
            <button type="button" onClick={disable} disabled={pending} className={btn.secondary}>
              Wyłącz tutaj
            </button>
          </>
        )}
      </div>
      {msg && <p className="whitespace-pre-wrap break-words text-sm text-muted">{msg}</p>}
    </div>
  );
}
