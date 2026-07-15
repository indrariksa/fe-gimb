import { useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Button } from "../components/atoms/Button";
import { Icon } from "../components/atoms/Icon";
import { Brand } from "../components/molecules/Brand";
import { useAuth } from "../context/AuthContext";
import { useThemeSettings } from "../theme/ThemeContext";

export function LoginPage() {
  const { theme } = useThemeSettings();
  const { login, isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("admin@gmail.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to={isAdmin ? "/admin" : "/businesses"} replace />;
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const user = await login({ email, password });
      const target = (location.state as { from?: string } | null)?.from;
      navigate(target && target !== "/login" ? target : user.role === "admin" ? "/admin" : "/businesses", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login gagal");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Brand name={theme.appName} compact />
        <div>
          <h1>Masuk ke dashboard</h1>
          <p>Gunakan akun yang sudah terdaftar untuk mengelola toko dan diagnosis bisnis.</p>
        </div>
        <form onSubmit={submit} className="auth-form">
          <label>
            <span>Email</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label>
            <span>Password</span>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} />
          </label>
          {error && <p className="form-error">{error}</p>}
          <Button className="btn--shiny-dashboard" type="submit" disabled={isSubmitting}>{isSubmitting ? "Memproses..." : "Login"} <Icon name="arrow" size={18} /></Button>
        </form>
        <p className="auth-link">Belum punya akun? <Link to="/register">Daftar akun</Link></p>
        <p className="auth-link auth-link--landing"><Link to="/">Kembali ke landing page</Link></p>
      </section>
    </main>
  );
}
