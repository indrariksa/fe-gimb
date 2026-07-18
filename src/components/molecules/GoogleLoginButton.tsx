import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import type { User } from "../../services/api/types";

type GoogleCredentialResponse = {
  credential?: string;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (response: GoogleCredentialResponse) => void }) => void;
          renderButton: (parent: HTMLElement, options: { theme: string; size: string; text: string; shape: string; width: number }) => void;
        };
      };
    };
  }
}

const googleScriptId = "google-identity-services";
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const isGoogleLoginConfigured = Boolean(googleClientId);

type GoogleLoginButtonProps = {
  onSuccess: (user: User) => void;
  onError: (message: string) => void;
  action?: (payload: { id_token: string }) => Promise<User>;
  label?: string;
};

function loadGoogleScript() {
  return new Promise<void>((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }
    const existing = document.getElementById(googleScriptId) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Gagal memuat Google Login")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = googleScriptId;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Gagal memuat Google Login"));
    document.head.appendChild(script);
  });
}

export function GoogleLoginButton({ onSuccess, onError, action, label = "Lanjutkan dengan Google" }: GoogleLoginButtonProps) {
  const { googleLogin } = useAuth();
  const submitCredential = action ?? googleLogin;
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const [isLoading, setIsLoading] = useState(isGoogleLoginConfigured);

  useEffect(() => {
    if (!isGoogleLoginConfigured || !buttonRef.current) return;
    let isMounted = true;

    loadGoogleScript()
      .then(() => {
        if (!isMounted || !buttonRef.current || !window.google?.accounts?.id) return;
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response) => {
            if (!response.credential) {
              onError("Credential Google tidak ditemukan.");
              return;
            }
            try {
              const user = await submitCredential({ id_token: response.credential });
              onSuccess(user);
            } catch (err) {
              onError(err instanceof Error ? err.message : "Proses Google gagal");
            }
          },
        });
        buttonRef.current.innerHTML = "";
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "rectangular",
          width: 390,
        });
      })
      .catch((err) => onError(err instanceof Error ? err.message : "Gagal memuat Google Login"))
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [onError, onSuccess, submitCredential]);

  return (
    <div className="google-login">
      <button
        type="button"
        className="google-login__fallback"
        tabIndex={isGoogleLoginConfigured ? -1 : 0}
        aria-hidden={isGoogleLoginConfigured ? "true" : undefined}
        onClick={() => {
          if (!isGoogleLoginConfigured) {
            onError("VITE_GOOGLE_CLIENT_ID belum diisi. Isi Client ID Google di .env frontend dan restart Vite.");
          }
        }}
      >
        <span aria-hidden="true">G</span>
        {label}
      </button>
      {isGoogleLoginConfigured && <div ref={buttonRef} className="google-login__button" />}
      {isLoading && <span>Memuat Google Login...</span>}
    </div>
  );
}
