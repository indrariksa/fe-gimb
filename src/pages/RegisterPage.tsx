import { useCallback, useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Button } from "../components/atoms/Button";
import { Icon } from "../components/atoms/Icon";
import { Brand } from "../components/molecules/Brand";
import { GoogleLoginButton } from "../components/molecules/GoogleLoginButton";
import { PublicThemeToggle } from "../components/molecules/PublicThemeToggle";
import { useAuth } from "../context/AuthContext";
import type { User } from "../services/api/types";
import { useThemeSettings } from "../theme/ThemeContext";

export function RegisterPage() {
  const { theme } = useThemeSettings();
  const { register, isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigateAfterAuth = useCallback((user: User) => {
    navigate(user.role === "admin" ? "/admin" : "/businesses", { replace: true });
  }, [navigate]);

  if (isAuthenticated) {
    return <Navigate to={isAdmin ? "/admin" : "/businesses"} replace />;
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const response = await register(form);
      navigate(`/registration-success?email=${encodeURIComponent(form.email)}`, {
        replace: true,
        state: { email: form.email, resendCooldownSeconds: response.resend_cooldown_seconds },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registrasi gagal");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <PublicThemeToggle className="public-theme-toggle--floating" />
      <section className="auth-card">
        <Brand name={theme.appName} compact />
        <div>
          <h1>Buat akun baru</h1>
        </div>
        <form onSubmit={submit} className="auth-form" autoComplete="off">
          <label>
            <span>Nama lengkap</span>
            <input placeholder="Masukkan Nama Lengkap" value={form.full_name} onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))} autoComplete="off" required />
          </label>
          <label>
            <span>Email</span>
            <input type="email" placeholder="Masukkan Email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} autoComplete="off" required />
          </label>
          <label>
            <span>Password</span>
            <div className="auth-password-field">
              <input type={showPassword ? "text" : "password"} placeholder="Masukkan Password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} autoComplete="new-password" required minLength={8} />
              <button
                type="button"
                aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                onClick={() => setShowPassword((current) => !current)}
              >
                <Icon name="eye" size={20} />
              </button>
            </div>
          </label>
          {error && <p className="form-error">{error}</p>}
          <Button className="btn--shiny-dashboard" type="submit" disabled={isSubmitting}>{isSubmitting ? "Memproses..." : "Daftar"} <Icon name="arrow" size={18} /></Button>
        </form>
        <div className="auth-divider"><span>atau</span></div>
        <GoogleLoginButton onSuccess={navigateAfterAuth} onError={setError} />
        <p className="auth-link">Sudah punya akun? <Link to="/login">Login</Link></p>
        <p className="auth-link auth-link--landing"><Link to="/">Kembali ke landing page</Link></p>
      </section>
    </main>
  );
}
