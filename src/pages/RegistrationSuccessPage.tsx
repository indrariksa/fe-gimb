import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "../components/atoms/Button";
import { Icon } from "../components/atoms/Icon";
import { Brand } from "../components/molecules/Brand";
import { PublicThemeToggle } from "../components/molecules/PublicThemeToggle";
import * as authApi from "../services/api/auth";
import { ApiError } from "../services/api/client";
import type { EmailVerificationCooldownError } from "../services/api/types";
import { useThemeSettings } from "../theme/ThemeContext";

const fallbackResendCooldownSeconds = 60;

function retryAfterSeconds(error: ApiError) {
  return (error.details as EmailVerificationCooldownError | null)?.retry_after_seconds ?? fallbackResendCooldownSeconds;
}

export function RegistrationSuccessPage() {
  const { theme } = useThemeSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const locationState = location.state as { email?: string; resendCooldownSeconds?: number } | null;
  const stateEmail = locationState?.email;
  const email = useMemo(() => {
    return stateEmail || params.get("email") || "";
  }, [stateEmail, params]);
  const initialCooldown = locationState?.resendCooldownSeconds ?? fallbackResendCooldownSeconds;
  const [countdown, setCountdown] = useState(stateEmail ? initialCooldown : 0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = window.setTimeout(() => setCountdown((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown]);

  if (!email) {
    return <Navigate to="/register" replace />;
  }

  const resend = async () => {
    setError("");
    setMessage("");
    setIsResending(true);
    try {
      const response = await authApi.resendEmailVerification({ email });
      const cooldown = response.resend_cooldown_seconds || fallbackResendCooldownSeconds;
      setCountdown(cooldown);
      setMessage("Jika email terdaftar dan belum aktif, link verifikasi akan dikirim. Cek kotak masuk, folder spam, atau promosi ya.");
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) setCountdown(retryAfterSeconds(err));
      setError(err instanceof Error ? err.message : "Gagal mengirim ulang email verifikasi");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <main className="auth-page">
      <PublicThemeToggle className="public-theme-toggle--floating" />
      <section className="auth-card auth-card--centered">
        <Brand name={theme.appName} compact />
        <div className="verify-email-state verify-email-state--success">
          <div className="verify-email-state__icon">
            <Icon name="check" size={24} />
          </div>
          <h1>Registrasi berhasil</h1>
          <p>Kami sudah mengirim link verifikasi ke email kamu.</p>
          <p>Cek kotak masuk, folder spam, atau promosi untuk aktivasi akun.</p>
          <strong className="registration-email">{email}</strong>
        </div>
        {message && <p className="form-success">{message}</p>}
        {error && <p className="form-error">{error}</p>}
        <button className="auth-resend-button" type="button" onClick={resend} disabled={countdown > 0 || isResending}>
          {isResending ? "Mengirim..." : countdown > 0 ? `Kirim ulang dalam ${countdown}s` : "Kirim ulang email verifikasi"}
        </button>
        <Button className="btn--shiny-dashboard" type="button" onClick={() => navigate("/login")}>
          Ke halaman login <Icon name="arrow" size={18} />
        </Button>
        <p className="auth-link auth-link--landing"><Link to="/">Kembali ke landing page</Link></p>
      </section>
    </main>
  );
}
