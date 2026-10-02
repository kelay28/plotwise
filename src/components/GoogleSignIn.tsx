import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

/**
 * "Continue with Google" via Google Identity Services: Google's popup runs on our own origin,
 * so the account chooser names plotwise.kyleacalian.com instead of the Supabase project URL.
 * The Google ID token is then exchanged for a Supabase session (signInWithIdToken).
 * Without VITE_GOOGLE_CLIENT_ID it falls back to Supabase's redirect flow.
 */

const CLIENT_ID = import.meta.env["VITE_GOOGLE_CLIENT_ID"] as string | undefined;
const GSI_SRC = "https://accounts.google.com/gsi/client";

type Gsi = {
  accounts: {
    id: {
      initialize: (o: Record<string, unknown>) => void;
      renderButton: (el: HTMLElement, o: Record<string, unknown>) => void;
    };
  };
};

function loadGsi(): Promise<Gsi> {
  const w = window as unknown as { google?: Gsi };
  if (w.google?.accounts?.id) return Promise.resolve(w.google);
  return new Promise((resolve, reject) => {
    let s = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SRC}"]`);
    if (!s) {
      s = Object.assign(document.createElement("script"), { src: GSI_SRC, async: true, defer: true });
      document.head.appendChild(s);
    }
    s.addEventListener("load", () => (w.google ? resolve(w.google) : reject(new Error("Google sign-in failed to load"))));
    s.addEventListener("error", () => reject(new Error("Google sign-in failed to load")));
  });
}

/** Google gets the SHA-256 of the nonce; Supabase gets the raw value and checks they match. */
async function makeNonce() {
  const raw = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(24))));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  const hashed = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
  return { raw, hashed };
}

export function GoogleSignIn() {
  const box = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;
    (async () => {
      try {
        const [google, nonce] = await Promise.all([loadGsi(), makeNonce()]);
        if (cancelled || !box.current) return;
        google.accounts.id.initialize({
          client_id: CLIENT_ID,
          nonce: nonce.hashed,
          use_fedcm_for_button: true,
          callback: async ({ credential }: { credential: string }) => {
            const { error } = await supabase.auth.signInWithIdToken({ provider: "google", token: credential, nonce: nonce.raw });
            if (error) toast.error(error.message);
          },
        });
        google.accounts.id.renderButton(box.current, {
          theme: "outline",
          size: "large",
          shape: "pill",
          text: "continue_with",
          width: Math.min(400, box.current.offsetWidth || 320),
        });
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!CLIENT_ID || failed) {
    return (
      <Button variant="outline" className="w-full" onClick={async () => {
        const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin + "/auth" } });
        if (error) toast.error(error.message);
      }}>Continue with Google</Button>
    );
  }
  return <div ref={box} className="flex h-10 w-full justify-center" />;
}
