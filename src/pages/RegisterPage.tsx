import { useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Button } from "../components/atoms/Button";
import { Icon } from "../components/atoms/Icon";
import { Brand } from "../components/molecules/Brand";
import { useAuth } from "../context/AuthContext";
import { useThemeSettings } from "../theme/ThemeContext";

export function RegisterPage() {
  const { theme } = useThemeSettings();
  const { register, isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: "", email: "", password: "" });
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
      const user = await register(form);
      navigate(user.role === "admin" ? "/admin" : "/businesses", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registrasi gagal");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Brand name={theme.appName} compact />
        <div>
          <h1>Buat akun baru</h1>
          <p>Akun baru otomatis memiliki role user. Role admin diatur manual dari Supabase.</p>
        </div>
        <form onSubmit={submit} className="auth-form">
          <label>
            <span>Nama lengkap</span>
            <input placeholder="Masukkan Nama Lengkap" value={form.full_name} onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))} required />
          </label>
          <label>
            <span>Email</span>
            <input type="email" placeholder="Masukkan Email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} required />
          </label>
          <label>
            <span>Password</span>
            <input type="password" placeholder="Masukkan Password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} required minLength={8} />
          </label>
          {error && <p className="form-error">{error}</p>}
          <Button className="btn--shiny-dashboard" type="submit" disabled={isSubmitting}>{isSubmitting ? "Memproses..." : "Daftar"} <Icon name="arrow" size={18} /></Button>
        </form>
        <p className="auth-link">Sudah punya akun? <Link to="/login">Login</Link></p>
        <p className="auth-link auth-link--landing"><Link to="/">Kembali ke landing page</Link></p>
      </section>
    </main>
  );
}
