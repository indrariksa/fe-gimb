import { useCallback, useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Button } from "../components/atoms/Button";
import { Icon } from "../components/atoms/Icon";
import { Brand } from "../components/molecules/Brand";
import { GoogleLoginButton } from "../components/molecules/GoogleLoginButton";
import { PublicThemeToggle } from "../components/molecules/PublicThemeToggle";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../services/api/client";
import * as authApi from "../services/api/auth";
import type { User } from "../services/api/types";
import { useThemeSettings } from "../theme/ThemeContext";

export function LoginPage() {
  const { theme } = useThemeSettings();
  const { login, isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [canResendVerification, setCanResendVerification] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const navigateAfterLogin = useCallback((user: User) => {
    const target = (location.state as { from?: string } | null)?.from;
    navigate(target && target !== "/login" ? target : user.role === "admin" ? "/admin" : "/businesses", { replace: true });
  }, [location.state, navigate]);

  if (isAuthenticated) {
    return <Navigate to={isAdmin ? "/admin" : "/businesses"} replace />;
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setCanResendVerification(false);
    setIsSubmitting(true);
    try {
      const user = await login({ email, password });
      navigateAfterLogin(user);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) setCanResendVerification(true);
      setError(err instanceof Error ? err.message : "Login gagal");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resendVerification = async () => {
    setError("");
    setSuccess("");
    setIsResending(true);
    try {
      await authApi.resendEmailVerification({ email });
      setSuccess("Jika email terdaftar dan belum aktif, link verifikasi akan dikirim. Cek kotak masuk, folder spam, atau promosi ya.");
      setCanResendVerification(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengirim ulang email verifikasi");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <main className="auth-page">
      <PublicThemeToggle className="public-theme-toggle--floating" />
      <section className="auth-card">
        <Brand name={theme.appName} compact />
        <div>
          <h1>Masuk ke dashboard</h1>
          <p>Gunakan akun yang sudah terdaftar untuk mengelola toko dan diagnosis bisnis.</p>
        </div>
        <form onSubmit={submit} className="auth-form" autoComplete="off">
          <label>
            <span>Email</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="off" required />
          </label>
          <label>
            <span>Password</span>
            <div className="auth-password-field">
              <input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="off" required minLength={8} />
              <button type="button" onClick={() => setShowPassword((current) => !current)}>{showPassword ? "Sembunyikan" : "Lihat"}</button>
            </div>
          </label>
          {success && <p className="form-success">{success}</p>}
          {error && <p className="form-error">{error}</p>}
          {canResendVerification && (
            <button className="auth-inline-action" type="button" onClick={resendVerification} disabled={isResending}>
              {isResending ? "Mengirim..." : "Kirim ulang email verifikasi"}
            </button>
          )}
          <Button className="btn--shiny-dashboard" type="submit" disabled={isSubmitting}>{isSubmitting ? "Memproses..." : "Login"} <Icon name="arrow" size={18} /></Button>
        </form>
        <div className="auth-divider"><span>atau</span></div>
        <GoogleLoginButton onSuccess={navigateAfterLogin} onError={setError} />
        <p className="auth-link">Belum punya akun? <Link to="/register">Daftar akun</Link></p>
        <p className="auth-link auth-link--landing"><Link to="/">Kembali ke landing page</Link></p>
      </section>
    </main>
  );
}
