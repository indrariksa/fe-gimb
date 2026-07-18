# Page Map

## Public

| Route | Halaman | Komponen Utama | Auth | Role | API yang Digunakan | Fungsi |
| --- | --- | --- | --- | --- | --- | --- |
| `/` | `LandingPage` | `LandingHero`, `Brand`, `Button`, `Icon` | No | Public | Tidak ada | Landing page marketing/preview dashboard. |
| `/login` | `LoginPage` | `Brand`, `Button`, `Icon`, `AuthContext.login` | No | Public | `POST /auth/login`, `POST /auth/email/verification/resend` | Login user/admin, simpan session, redirect berdasarkan role atau route asal; tampilkan resend jika email belum verified. |
| `/register` | `RegisterPage` | `Brand`, `Button`, `Icon`, `AuthContext.register` | No | Public | `POST /auth/register` | Registrasi user baru dan tampilkan instruksi cek email verifikasi tanpa menyimpan session. |
| `/registration-success` | `RegistrationSuccessPage` | `Brand`, `Button`, `Icon` | No | Public | `POST /auth/email/verification/resend` | Pemberitahuan registrasi berhasil, menampilkan email tujuan, tombol resend email verifikasi, dan countdown cooldown dari response backend. |
| `/verify-email` | `VerifyEmailPage` | `Brand`, `Button`, `Icon` | No | Public | `POST /auth/email/verify`, `POST /auth/email/verification/resend` | Memverifikasi email dari token query string dengan deduplicate per token dan retry sekali untuk `404` sesaat, memberi CTA ke login, dan menyediakan resend link baru dengan countdown cooldown dari response backend saat verifikasi gagal. |

## Protected Umum

Route ini memakai `RequireAuth`. Admin dan user bisa mengakses, tetapi data API yang dipakai berbeda pada sebagian halaman.

| Route | Halaman | Komponen Utama | Auth | Role | API yang Digunakan | Fungsi |
| --- | --- | --- | --- | --- | --- | --- |
| `/businesses/:businessId/dashboard` | `DashboardPage` | `DashboardShell`, `ScoreCard`, `TrendChart`, `RadarProfile`, export buttons | Yes | `admin`, `user` | User: `GET /businesses/:id`, `GET /businesses/:id/inventory-submissions/latest`; Admin: `GET /admin/businesses/:id`, `GET /admin/businesses/:id/inventory-submissions/latest` | Dashboard diagnosis toko dengan skor keseluruhan, sub-score ringkas, action plan 30 hari dari `analysis.action_plan`, snapshot bisnis, PDF report executive summary, XLSX summary, dan tombol coba lagi saat load gagal. |
| `/businesses/:businessId/score` | `ScoreResultPage` | `DashboardShell`, score hero, action buttons | Yes | `admin`, `user` | User: `GET /businesses/:id`, `GET /businesses/:id/inventory-submissions/latest`; Admin: `GET /admin/businesses/:id`, `GET /admin/businesses/:id/inventory-submissions/latest` | Halaman hasil skor keseluruhan, insight dimensi terkuat/prioritas, dan tombol coba lagi saat load gagal. |
| `/businesses/:businessId/sub-scores` | `SubScoresPage` | `DashboardShell`, subscore cards, radar SVG, bar chart, inventory insight charts, export buttons | Yes | `admin`, `user` | User: `GET /businesses/:id`, `GET /businesses/:id/inventory-submissions/latest`; Admin: `GET /admin/businesses/:id`, `GET /admin/businesses/:id/inventory-submissions/latest` | Detail enam sub-skor bisnis, insight operasional dari data inventarisasi termasuk sisa margin, legend interpretasi skor, PDF report detailed analysis, XLSX multi-sheet, dan tombol coba lagi saat load gagal. |
| `/businesses/:businessId/inventory-input` | `AdminInventoryDetailPage` | `DashboardShell`, inventory readout, summary cards | Yes | `admin`, `user` | User: `GET /businesses/:id`, `GET /businesses/:id/inventory-submissions/latest`; Admin: `GET /admin/businesses/:id`, `GET /admin/businesses/:id/inventory-submissions/latest`, `GET /admin/users?limit=100&offset=0` | Detail data inventarisasi untuk user dari menu Hasil Input/dashboard/daftar toko dan untuk admin jika memakai route umum, dengan tombol coba lagi saat load gagal. |
| `/businesses/:businessId/inventory/new` | `InventoryPage` | `DashboardShell`, `TextField`, confirmation dialog | Yes | `admin`, `user` | `GET /businesses/:id`, `GET /businesses/:id/inventory-submissions/latest`, `POST /businesses/:id/inventory-submissions` | Form inventarisasi business-scoped; menyimpan draft lokal, submit ke backend, dan tombol coba lagi saat pengecekan awal gagal. |
| `/businesses/:businessId/analysis` | `AnalysisPage` | Progress ring, step list, `Button` | Yes | `admin`, `user` | Tidak ada | Simulasi animasi analisis 5.2 detik lalu tombol ke score result. |
| `/settings` | `SettingsPage` | `DashboardShell`, form setup/ubah password, `ThemeCustomizer` | Yes | `admin`, `user` | `POST /me/password/setup`, `PATCH /me/password` | Pengaturan keamanan akun untuk setup password akun Google-only, ubah password mandiri, dan pengaturan tema lokal warna/dark mode. |
| `/dashboard` | `Navigate` | `Navigate` | Yes | `admin`, `user` | Tidak ada | Redirect ke `/businesses`. |
| `/inventory` | `Navigate` | `Navigate` | Yes | `admin`, `user` | Tidak ada | Redirect ke `/businesses`. |
| `/analysis` | `Navigate` | `Navigate` | Yes | `admin`, `user` | Tidak ada | Redirect ke `/businesses`. |

## User-Only

Route ini memakai `RequireAuth userOnly`. Admin diarahkan ke `/admin`.

| Route | Halaman | Komponen Utama | Auth | Role | API yang Digunakan | Fungsi |
| --- | --- | --- | --- | --- | --- | --- |
| `/businesses` | `BusinessesPage` | `DashboardShell`, business cards, business create form, industry combobox | Yes | `user` | `GET /businesses`, `GET /settings/business-limit`, `GET /businesses/:id/inventory-submissions/latest`, `POST /businesses` | Daftar toko user, status inventory tiap toko, tombol dashboard/detail input untuk toko yang sudah ada hasil, business limit, tambah toko baru, dan tombol coba lagi saat load daftar gagal. |

## Admin-Only

Route ini memakai `RequireAuth adminOnly`. User non-admin diarahkan ke `/businesses`.

| Route | Halaman | Komponen Utama | Auth | Role | API yang Digunakan | Fungsi |
| --- | --- | --- | --- | --- | --- | --- |
| `/admin` | `AdminPage` | `DashboardShell`, admin metrics, diagnosis table, users list, audit logs, pagination, confirmation dialog | Yes | `admin` | `GET /admin/dashboard/summary`, `GET /admin/settings/business-limit`, `PATCH /admin/settings/business-limit`, `GET /admin/users`, `PATCH /admin/users/:id/status`, `GET /admin/businesses`, `GET /admin/diagnosis-watchlist`, `GET /admin/audit-logs` | Dashboard admin untuk monitoring operasional, limit toko, user status, diagnosis watchlist, audit logs, dan tombol coba lagi saat load data gagal. |
| `/admin/businesses/:businessId/inventory-input` | `AdminInventoryDetailPage` | `DashboardShell`, inventory readout, summary cards | Yes | `admin` | `GET /admin/businesses/:id`, `GET /admin/businesses/:id/inventory-submissions/latest`, `GET /admin/users?limit=100&offset=0` | Detail input inventarisasi user untuk business tertentu dari monitoring admin. |

## Fallback

| Route | Halaman | Komponen Utama | Auth | Role | API yang Digunakan | Fungsi |
| --- | --- | --- | --- | --- | --- | --- |
| `*` | `Navigate` | `Navigate` | No | Public | Tidak ada | Redirect semua route tidak dikenal ke `/`. |
