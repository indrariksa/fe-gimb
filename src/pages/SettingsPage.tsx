import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Button } from "../components/atoms/Button";
import { Icon } from "../components/atoms/Icon";
import { GoogleLoginButton } from "../components/molecules/GoogleLoginButton";
import { ThemeCustomizer } from "../components/molecules/ThemeCustomizer";
import { DashboardShell } from "../components/organisms/DashboardShell";
import { useAuth } from "../context/AuthContext";
import * as authApi from "../services/api/auth";
import { ApiError, getFriendlyApiError } from "../services/api/client";

type PasswordForm = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

const emptyPasswordForm: PasswordForm = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

function passwordScore(password: string) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return Math.min(score, 5);
}

export function SettingsPage() {
  const { isAdmin, user, linkGoogleAccount, refreshUser, unlinkGoogleAccount, updateProfile } = useAuth();
  const [form, setForm] = useState<PasswordForm>(emptyPasswordForm);
  const [profileName, setProfileName] = useState(user?.full_name ?? "");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProfileSubmitting, setIsProfileSubmitting] = useState(false);
  const [isProfileConfirmOpen, setIsProfileConfirmOpen] = useState(false);
  const [isPasswordConfirmOpen, setIsPasswordConfirmOpen] = useState(false);
  const [isGoogleUnlinkConfirmOpen, setIsGoogleUnlinkConfirmOpen] = useState(false);
  const [isGoogleUnlinkSubmitting, setIsGoogleUnlinkSubmitting] = useState(false);
  const score = useMemo(() => passwordScore(form.newPassword), [form.newPassword]);
  const scoreLabel = score >= 4 ? "Kuat" : score >= 3 ? "Cukup" : form.newPassword ? "Perlu diperkuat" : "Belum diisi";
  const notice = error ? { type: "error", message: error } : success ? { type: "success", message: success } : null;
  const hasPassword = user?.has_password ?? true;
  const hasGoogle = user?.has_google ?? false;
  const loginMethodLabel = hasPassword && hasGoogle ? "Email & Password + Google" : hasGoogle ? "Google" : "Email & Password";
  const googleLinkHint = hasGoogle
    ? hasPassword
      ? "Google sudah tertaut. Kamu bisa melepasnya karena login password sudah aktif."
      : "Buat password manual dulu sebelum melepas Google agar akun tetap bisa login."
    : "Gunakan akun Google dengan email yang sama untuk login lebih cepat.";

  useEffect(() => {
    setProfileName(user?.full_name ?? "");
  }, [user?.full_name]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => {
      setError("");
      setSuccess("");
    }, 3600);
    return () => window.clearTimeout(timer);
  }, [error, success]);

  const updateField = (field: keyof PasswordForm, value: string) => {
    setError("");
    setSuccess("");
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submitProfile = (event: FormEvent) => {
    event.preventDefault();
    const fullName = profileName.trim();
    setError("");
    setSuccess("");
    if (fullName.length < 2) {
      setError("Nama minimal 2 karakter.");
      return;
    }
    if (fullName === user?.full_name) {
      setSuccess("Nama profil sudah sesuai.");
      return;
    }
    setIsProfileConfirmOpen(true);
  };

  const saveProfile = async () => {
    setIsProfileSubmitting(true);
    try {
      await updateProfile({ full_name: profileName.trim() });
      setIsProfileConfirmOpen(false);
      setSuccess("Nama profil berhasil diperbarui.");
    } catch (err) {
      setIsProfileConfirmOpen(false);
      setError(getFriendlyApiError(err, "Gagal mengubah nama profil."));
    } finally {
      setIsProfileSubmitting(false);
    }
  };

  const linkGoogle = useCallback(async (payload: { id_token: string }) => {
    try {
      return await linkGoogleAccount(payload);
    } catch (err) {
      throw new Error(getFriendlyApiError(err, "Gagal menautkan akun Google. Pastikan email Google sama dengan email akun ini."));
    }
  }, [linkGoogleAccount]);

  const handleGoogleLinked = useCallback(() => {
    setError("");
    setSuccess("Akun Google berhasil ditautkan.");
  }, []);

  const unlinkGoogle = async () => {
    setError("");
    setSuccess("");
    setIsGoogleUnlinkSubmitting(true);
    try {
      await unlinkGoogleAccount();
      setIsGoogleUnlinkConfirmOpen(false);
      setSuccess("Tautan Google berhasil dilepas.");
    } catch (err) {
      setIsGoogleUnlinkConfirmOpen(false);
      setError(getFriendlyApiError(err, "Gagal melepas tautan Google."));
    } finally {
      setIsGoogleUnlinkSubmitting(false);
    }
  };

  const submitPassword = (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if ((hasPassword && !form.currentPassword) || !form.newPassword || !form.confirmPassword) {
      setError("Semua field password wajib diisi.");
      return;
    }
    if (form.newPassword.length < 8) {
      setError("Password baru minimal 8 karakter.");
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError("Konfirmasi password belum sama.");
      return;
    }
    if (hasPassword && form.currentPassword === form.newPassword) {
      setError("Password baru harus berbeda dari password sekarang.");
      return;
    }

    setIsPasswordConfirmOpen(true);
  };

  const savePassword = async () => {
    setError("");
    setSuccess("");
    setIsSubmitting(true);
    try {
      if (hasPassword) {
        await authApi.changePassword({
          current_password: form.currentPassword,
          new_password: form.newPassword,
          confirm_password: form.confirmPassword,
        });
      } else {
        await authApi.setupPassword({
          new_password: form.newPassword,
          confirm_password: form.confirmPassword,
        });
        await refreshUser();
      }
      setForm(emptyPasswordForm);
      setIsPasswordConfirmOpen(false);
      setSuccess(hasPassword ? "Password berhasil diubah. Sesi Anda tetap aktif." : "Password berhasil dibuat. Sekarang Anda bisa login dengan Google atau email/password.");
    } catch (err) {
      setIsPasswordConfirmOpen(false);
      setError(err instanceof ApiError && hasPassword ? "Salah mengisi password sekarang." : getFriendlyApiError(err, hasPassword ? "Gagal mengubah password." : "Gagal membuat password."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardShell activeView="settings" title="Pengaturan">
      <section className="settings-page">
        <div className="form-hero">
          <h2>Pengaturan aplikasi</h2>
          <p>
            {isAdmin
              ? "Kelola preferensi tampilan dan keamanan akun admin."
              : "Atur tampilan dashboard dan keamanan akun Anda."}
          </p>
        </div>

        <div className="settings-grid">
          <div className="settings-account-grid">
            <form className="security-panel security-panel--profile" onSubmit={submitProfile}>
              <div className="security-panel__intro">
                <span className="security-panel__badge">
                  <Icon name="settings" size={26} />
                </span>
                <div>
                  <span>{user?.email ?? "Akun aktif"}</span>
                  <h3>Profil akun</h3>
                  <p>Ubah nama yang tampil di dashboard, menu akun, dan halaman admin.</p>
                </div>
              </div>
              <div className="password-fields">
                <label>
                  <span>Nama lengkap</span>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(event) => {
                      setError("");
                      setSuccess("");
                      setProfileName(event.target.value);
                    }}
                    placeholder="Masukkan nama lengkap"
                    minLength={2}
                    maxLength={120}
                  />
                </label>
                <label>
                  <span>Metode login</span>
                  <input type="text" value={loginMethodLabel} disabled />
                </label>
              </div>
              <div className="profile-google-link">
                {hasGoogle && hasPassword ? (
                  <Button
                    className="btn--google-unlink"
                    variant="secondary"
                    type="button"
                    onClick={() => {
                      setError("");
                      setSuccess("");
                      setIsGoogleUnlinkConfirmOpen(true);
                    }}
                  >
                    Lepas tautan Google
                  </Button>
                ) : hasGoogle ? (
                  <Button variant="secondary" type="button" disabled>
                    Buat password dulu
                  </Button>
                ) : (
                  <GoogleLoginButton
                    label="Tautkan Google"
                    action={linkGoogle}
                    onSuccess={handleGoogleLinked}
                    onError={setError}
                  />
                )}
                <p>{googleLinkHint}</p>
              </div>
              <Button className="btn--shiny-dashboard" type="submit" disabled={isProfileSubmitting}>
                Simpan Profil
              </Button>
            </form>

            <form className="security-panel" onSubmit={submitPassword}>
              <div className="security-panel__intro">
                <span className="security-panel__badge">
                  <Icon name="settings" size={26} />
                </span>
                <div>
                  <span>{user?.email ?? "Akun aktif"}</span>
                  <h3>{hasPassword ? "Ubah password" : "Buat password login"}</h3>
                  <p>
                    {hasPassword
                      ? "Gunakan password unik agar akses dashboard tetap aman."
                      : "Akun Google Anda belum punya password manual. Buat sekali agar bisa login fleksibel."}
                  </p>
                </div>
              </div>

              <div className="password-fields">
                {hasPassword && (
                  <label>
                    <span>Password sekarang</span>
                    <input
                      type="password"
                      autoComplete="current-password"
                      value={form.currentPassword}
                      onChange={(event) => updateField("currentPassword", event.target.value)}
                      placeholder="Masukkan password aktif"
                    />
                  </label>
                )}
                <label>
                  <span>Password baru</span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    value={form.newPassword}
                    onChange={(event) => updateField("newPassword", event.target.value)}
                    placeholder="Minimal 8 karakter"
                  />
                </label>
                <label>
                  <span>Konfirmasi password baru</span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    value={form.confirmPassword}
                    onChange={(event) => updateField("confirmPassword", event.target.value)}
                    placeholder="Ulangi password baru"
                  />
                </label>
              </div>

              <div className="password-strength" aria-label={`Kekuatan password ${scoreLabel}`}>
                <div>
                  <span>Kekuatan password</span>
                  <strong>{scoreLabel}</strong>
                </div>
                <div className="password-strength__bar">
                  <i style={{ width: form.newPassword ? `${score * 20}%` : "0%" }} />
                </div>
              </div>

              <Button className="btn--shiny-dashboard" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Menyimpan..." : hasPassword ? "Simpan password" : "Buat password"}
              </Button>
            </form>
          </div>

          <ThemeCustomizer scope="colors" />
        </div>

        {notice && (
          <div className={`settings-toast settings-toast--${notice.type}`} role="alert">
            <Icon name={notice.type === "success" ? "check" : "alert"} size={20} />
            <span>{notice.message}</span>
          </div>
        )}

        {isProfileConfirmOpen && (
          <div className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="profile-confirm-title">
            <div className="confirm-dialog__card">
              <span className="confirm-dialog__icon">
                <Icon name="settings" size={34} />
              </span>
              <h2 id="profile-confirm-title">Simpan nama baru?</h2>
              <p>Nama ini akan tampil di dashboard, menu akun, dan beberapa halaman admin.</p>
              <div className="confirm-dialog__actions">
                <Button variant="secondary" onClick={() => setIsProfileConfirmOpen(false)} disabled={isProfileSubmitting}>Batal</Button>
                <Button onClick={saveProfile} disabled={isProfileSubmitting}>{isProfileSubmitting ? "Menyimpan..." : "Ya, Simpan"}</Button>
              </div>
            </div>
          </div>
        )}

        {isPasswordConfirmOpen && (
          <div className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="password-confirm-title">
            <div className="confirm-dialog__card">
              <span className="confirm-dialog__icon">
                <Icon name="settings" size={34} />
              </span>
              <h2 id="password-confirm-title">{hasPassword ? "Simpan password baru?" : "Buat password login?"}</h2>
              <p>{hasPassword ? "Pastikan password baru sudah benar. Perubahan ini akan dipakai untuk login berikutnya." : "Password ini akan mengaktifkan login email/password untuk akun Google Anda."}</p>
              <div className="confirm-dialog__actions">
                <Button variant="secondary" onClick={() => setIsPasswordConfirmOpen(false)} disabled={isSubmitting}>Batal</Button>
                <Button onClick={savePassword} disabled={isSubmitting}>{isSubmitting ? "Menyimpan..." : "Ya, Simpan"}</Button>
              </div>
            </div>
          </div>
        )}

        {isGoogleUnlinkConfirmOpen && (
          <div className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="google-unlink-confirm-title">
            <div className="confirm-dialog__card">
              <span className="confirm-dialog__icon confirm-dialog__icon--danger">
                <Icon name="alert" size={34} />
              </span>
              <h2 id="google-unlink-confirm-title">Lepas tautan Google?</h2>
              <p>Setelah dilepas, akun ini tidak bisa login menggunakan Google sampai kamu menautkannya kembali.</p>
              <div className="confirm-dialog__actions">
                <Button variant="secondary" onClick={() => setIsGoogleUnlinkConfirmOpen(false)} disabled={isGoogleUnlinkSubmitting}>Batal</Button>
                <Button onClick={unlinkGoogle} disabled={isGoogleUnlinkSubmitting}>{isGoogleUnlinkSubmitting ? "Melepas..." : "Ya, Lepas"}</Button>
              </div>
            </div>
          </div>
        )}
      </section>
    </DashboardShell>
  );
}
