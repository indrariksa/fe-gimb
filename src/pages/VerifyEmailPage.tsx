import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "../components/atoms/Button";
import { Icon } from "../components/atoms/Icon";
import { Brand } from "../components/molecules/Brand";
import { PublicThemeToggle } from "../components/molecules/PublicThemeToggle";
import * as authApi from "../services/api/auth";
import { ApiError } from "../services/api/client";
import type { EmailVerificationCooldownError } from "../services/api/types";
import { useThemeSettings } from "../theme/ThemeContext";

const verifiedTokens = new Set<string>();
const pendingVerifications = new Map<string, Promise<void>>();
const fallbackResendCooldownSeconds = 60;

function retryAfterSeconds(error: ApiError) {
  return (error.details as EmailVerificationCooldownError | null)?.retry_after_seconds ?? fallbackResendCooldownSeconds;
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function verifyEmailOnce(token: string) {
  if (verifiedTokens.has(token)) return Promise.resolve();

  let pending = pendingVerifications.get(token);
  if (!pending) {
    pending = authApi.verifyEmail({ token })
      .catch(async (err) => {
        if (err instanceof ApiError && err.status === 404) {
          await sleep(350);
          await authApi.verifyEmail({ token });
          return;
        }
        throw err;
      })
      .then(() => {
        verifiedTokens.add(token);
      })
      .finally(() => {
        pendingVerifications.delete(token);
      });
    pendingVerifications.set(token, pending);
  }

  return pending;
}

export function VerifyEmailPage() {
  const { theme } = useThemeSettings();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Memverifikasi email kamu...");
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [countdown, setCountdown] = useState(0);
  const [resendMessage, setResendMessage] = useState("");
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    const token = params.get("token") ?? "";
    if (!token) {
      setStatus("error");
      setMessage("Token verifikasi tidak ditemukan.");
      return;
    }

    let isMounted = true;
    verifyEmailOnce(token)
      .then(() => {
        if (!isMounted) return;
        setStatus("success");
        setMessage("Email berhasil diverifikasi. Sekarang kamu bisa login.");
      })
      .catch((err) => {
        if (!isMounted) return;
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Verifikasi email gagal.");
      });

    return () => {
      isMounted = false;
    };
  }, [params]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = window.setTimeout(() => setCountdown((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown]);

  const resendVerification = async () => {
    setResendMessage("");
    setIsResending(true);
    try {
      const response = await authApi.resendEmailVerification({ email });
      setCountdown(response.resend_cooldown_seconds || fallbackResendCooldownSeconds);
      setResendMessage("Jika email terdaftar dan belum aktif, link verifikasi akan dikirim. Cek kotak masuk, folder spam, atau promosi ya.");
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) setCountdown(retryAfterSeconds(err));
      setResendMessage(err instanceof Error ? err.message : "Gagal mengirim ulang email verifikasi.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <main className="auth-page">
      <PublicThemeToggle className="public-theme-toggle--floating" />
      <section className="auth-card auth-card--centered">
        <Brand name={theme.appName} compact />
        <div className={`verify-email-state verify-email-state--${status}`}>
          <div className="verify-email-state__icon">
            <Icon name={status === "success" ? "check" : status === "error" ? "alert" : "refresh"} size={24} />
          </div>
          <h1>{status === "success" ? "Email terverifikasi" : status === "error" ? "Verifikasi gagal" : "Sebentar ya"}</h1>
          <p>{message}</p>
        </div>
        {status === "error" && (
          <div className="verify-resend">
            <label>
              <span>Email akun</span>
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="emailkamu@gmail.com" required />
            </label>
            {resendMessage && <p className={resendMessage.includes("akan dikirim") ? "form-success" : "form-error"}>{resendMessage}</p>}
            <button className="auth-resend-button" type="button" onClick={resendVerification} disabled={!email.trim() || countdown > 0 || isResending}>
              {isResending ? "Mengirim..." : countdown > 0 ? `Kirim ulang dalam ${countdown}s` : "Kirim link verifikasi baru"}
            </button>
          </div>
        )}
        <Button className="btn--shiny-dashboard" type="button" onClick={() => navigate(`/login${email ? `?email=${encodeURIComponent(email)}` : ""}`, { state: { email } })}>
          Ke halaman login <Icon name="arrow" size={18} />
        </Button>
      </section>
    </main>
  );
}
