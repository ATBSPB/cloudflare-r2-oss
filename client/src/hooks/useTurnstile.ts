import { useState, useCallback, useRef } from "react";

export function useTurnstile() {
  const [showModal, setShowModal] = useState(false);
  const resolveRef = useRef<((token: string) => void) | null>(null);
  const rejectRef = useRef<((err: Error) => void) | null>(null);
  const widgetIdRef = useRef<string | null>(null);

  const ensureToken = useCallback((): Promise<string> => {
    const existing = window.__turnstileToken;
    if (existing) return Promise.resolve(existing);

    return new Promise<string>((resolve, reject) => {
      resolveRef.current = resolve;
      rejectRef.current = reject;
      setShowModal(true);

      setTimeout(() => {
        const container = document.getElementById("turnstile-widget");
        if (container && window.turnstile) {
          if (widgetIdRef.current) {
            try { window.turnstile.remove(widgetIdRef.current); } catch {}
          }
          container.innerHTML = "";
          widgetIdRef.current = window.turnstile.render("#turnstile-widget", {
            sitekey: "0x4AAAAAADVWOfZ_ZQMCjDQO",
            callback: (token: string) => {
              window.__turnstileToken = token;
              if (widgetIdRef.current && window.turnstile) {
                try { window.turnstile.remove(widgetIdRef.current); } catch {}
              }
              widgetIdRef.current = null;
              setShowModal(false);
              resolveRef.current?.(token);
            },
            "error-callback": () => {
              if (widgetIdRef.current && window.turnstile) {
                try { window.turnstile.remove(widgetIdRef.current); } catch {}
              }
              widgetIdRef.current = null;
              setShowModal(false);
              rejectRef.current?.(new Error("Turnstile error"));
            },
          });
        }
      }, 50);
    });
  }, []);

  const cancel = useCallback(() => {
    setShowModal(false);
    if (widgetIdRef.current && window.turnstile) {
      try { window.turnstile.remove(widgetIdRef.current); } catch {}
    }
    widgetIdRef.current = null;
    rejectRef.current?.(new Error("Cancelled"));
  }, []);

  return { showModal, ensureToken, cancel };
}
