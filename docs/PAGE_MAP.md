# Page Map

## Public

| Route | Halaman | Komponen Utama | Auth | Role | API yang Digunakan | Fungsi |
| --- | --- | --- | --- | --- | --- | --- |
| `/` | `LandingPage` | `LandingHero`, `Brand`, `Button`, `Icon` | No | Public | Tidak ada | Landing page marketing/preview dashboard. |
| `/login` | `LoginPage` | `Brand`, `Button`, `Icon`, `AuthContext.login` | No | Public | `POST /auth/login`, `POST /auth/email/verification/resend` | Login user/admin, simpan session, redirect berdasarkan role atau route asal; field email bisa terisi dari query/state setelah verifikasi; tampilkan resend jika email belum verified. |
| `/register` | `RegisterPage` | `Brand`, `Button`, `Icon`, `AuthContext.register` | No | Public | `POST /auth/register` | Registrasi user baru dan tampilkan instruksi cek email verifikasi tanpa menyimpan session. |
| `/registration-success` | `RegistrationSuccessPage` | `Brand`, `Button`, `Icon` | No | Public | `POST /auth/email/verification/resend` | Pemberitahuan registrasi berhasil, menampilkan email tujuan, tombol resend email verifikasi, dan countdown cooldown dari response backend. |
| `/verify-email` | `VerifyEmailPage` | `Brand`, `Button`, `Icon` | No | Public | `POST /auth/email/verify`, `POST /auth/email/verification/resend` | Memverifikasi email dari token query string dengan deduplicate per token dan retry sekali untuk `404` sesaat, memberi CTA ke login dengan email terbawa, dan menyediakan resend link baru dengan countdown cooldown dari response backend saat verifikasi gagal. |

## Protected Umum

Route ini memakai `RequireAuth`. Admin dan user bisa mengakses, tetapi data API yang dipakai berbeda pada sebagian halaman.

| Route | Halaman | Komponen Utama | Auth | Role | API yang Digunakan | Fungsi |
| --- | --- | --- | --- | --- | --- | --- |
| `/businesses/:businessId/dashboard` | `DashboardRedirect` (di `App.tsx`) | `Navigate` | Yes | `admin`, `user` | Tidak ada | Redirect ke `/businesses/:businessId/sub-scores`. Halaman `DashboardPage` dihapus dan seluruh isinya digabung ke `SubScoresPage` (lihat baris di bawah) supaya tidak ada dua halaman dengan info yang sama. |
| `/businesses/:businessId/score` | `ScoreResultPage` | `DashboardShell`, score hero, action buttons | Yes | `admin`, `user` | User: `GET /businesses/:id`, `GET /businesses/:id/inventory-submissions/latest`; Admin: `GET /admin/businesses/:id`, `GET /admin/businesses/:id/inventory-submissions/latest` | Halaman hasil skor keseluruhan, insight dimensi terkuat/prioritas, dan tombol coba lagi saat load gagal. Tombol "Buka Dashboard" dihapus (redundan dengan "Lihat Sub Skor" setelah Dashboard digabung ke Sub Skor). |
| `/businesses/:businessId/sub-scores` | `SubScoresPage` | `DashboardShell`, health ring, `RadarProfile` (business snapshot), `TrendChart` (action plan 30 hari), insight narasi, subscore cards, radar SVG, bar chart, inventory insight charts, export buttons | Yes | `admin`, `user` | User: `GET /businesses/:id`, `GET /businesses/:id/inventory-submissions/latest`; Admin: `GET /admin/businesses/:id`, `GET /admin/businesses/:id/inventory-submissions/latest` | Halaman utama diagnosis toko: skor kesehatan keseluruhan, business snapshot, enam sub-skor detail, insight operasional dari data inventarisasi, legend interpretasi skor, satu PDF & satu XLSX gabungan (dulu terpisah di `DashboardPage`), dan tombol coba lagi saat load gagal. Action plan 30 hari dan insight prioritas/kekuatan/rekomendasi (rule-based) hanya ditampilkan untuk toko dengan omzet 6 bulan ≤ Rp 50 juta (`aiReportRevenueThreshold`), karena di atas threshold itu Laporan Kesehatan Bisnis sudah tersedia dan lebih detail — disembunyikan agar tidak ada narasi rule-based yang berpotensi beda dengan Laporan Kesehatan Bisnis. Menggantikan `DashboardPage` yang sudah dihapus. |
| `/businesses/:businessId/inventory-input` | `AdminInventoryDetailPage` | `DashboardShell`, inventory readout | Yes | `admin`, `user` | User: `GET /businesses/:id`, `GET /businesses/:id/inventory-submissions/latest`; Admin: `GET /admin/businesses/:id`, `GET /admin/businesses/:id/inventory-submissions/latest`, `GET /admin/users?limit=100&offset=0` | Detail data inventarisasi untuk user dari menu Hasil Input/Sub Skor/daftar toko dan untuk admin jika memakai route umum, dengan tombol coba lagi saat load gagal. Kartu ringkasan (omzet, transaksi, repeat ratio, dll) sudah dihapus dari halaman ini — dipindah sepenuhnya ke Business Snapshot di `/sub-scores` supaya tidak dobel. |
| `/businesses/:businessId/inventory/new` | `InventoryPage` | `DashboardShell`, `TextField`, confirmation dialog | Yes | `admin`, `user` | `GET /businesses/:id`, `GET /businesses/:id/inventory-submissions/latest`, `POST /businesses/:id/inventory-submissions` | Form inventarisasi business-scoped; menyimpan draft lokal, submit ke backend, dan tombol coba lagi saat pengecekan awal gagal. |
| `/businesses/:businessId/analysis` | `AnalysisPage` | Progress ring, step list, `Button` | Yes | `admin`, `user` | Tidak ada | Simulasi animasi analisis 5.2 detik lalu tombol ke score result. |
| `/businesses/:businessId/health-report` | `AIReportPage` | `DashboardShell`, `AIReportChart`, export buttons | Yes | `admin`, `user` | User: `GET /businesses/:id/health-report`, `POST /businesses/:id/health-report/regenerate`; Admin: `GET /admin/businesses/:id/health-report`, `POST /admin/businesses/:id/health-report/regenerate` | Laporan bisnis naratif Claude API dengan status processing/ready/failed, narasi per sub-skor, alternative solutions, chart, kartu "Kelayakan Investasi" (BEP/CAPEX/payback period/ROI + narasi, dari `report.financial_analysis` — optional, laporan lama sebelum field ini ada tidak menampilkannya), export PDF/XLSX, dan tombol generate ulang saat gagal. Ditampilkan ke user sebagai "Laporan Kesehatan Bisnis". |
| `/settings` | `SettingsPage` | `DashboardShell`, form profil, `GoogleLoginButton`, form setup/ubah password, `ThemeCustomizer` | Yes | `admin`, `user` | `PATCH /me`, `POST /me/google/link`, `DELETE /me/google/link`, `POST /me/password/setup`, `PATCH /me/password` | Pengaturan profile nama dengan dialog konfirmasi, metode login readonly, tautkan/lepas tautan Google dengan konfirmasi, guard password untuk akun Google-only, keamanan akun untuk setup password akun Google-only, ubah password mandiri, dan pengaturan tema lokal warna/dark mode. |
| `/dashboard` | `Navigate` | `Navigate` | Yes | `admin`, `user` | Tidak ada | Redirect ke `/businesses`. |
| `/inventory` | `Navigate` | `Navigate` | Yes | `admin`, `user` | Tidak ada | Redirect ke `/businesses`. |
| `/analysis` | `Navigate` | `Navigate` | Yes | `admin`, `user` | Tidak ada | Redirect ke `/businesses`. |

## User-Only

Route ini memakai `RequireAuth userOnly`. Admin diarahkan ke `/admin`.

| Route | Halaman | Komponen Utama | Auth | Role | API yang Digunakan | Fungsi |
| --- | --- | --- | --- | --- | --- | --- |
| `/businesses` | `BusinessesPage` | `DashboardShell`, business cards, business create form, industry combobox | Yes | `user` | `GET /businesses`, `GET /settings/business-limit`, `GET /businesses/:id/inventory-submissions/latest`, `POST /businesses` | Daftar toko user, status inventory tiap toko, tombol Sub Skor/detail input untuk toko yang sudah ada hasil, business limit, tambah toko baru, dan tombol coba lagi saat load daftar gagal. |

## Admin-Only

Route ini memakai `RequireAuth adminOnly`. User non-admin diarahkan ke `/businesses`.

| Route | Halaman | Komponen Utama | Auth | Role | API yang Digunakan | Fungsi |
| --- | --- | --- | --- | --- | --- | --- |
| `/admin` | `AdminSummaryPage` | `DashboardShell`, `HolographicCard` metrics, `AdminAnalyticsChart` (Chart.js: bar/doughnut/line/pie) | Yes | `admin` | `GET /admin/dashboard/summary`, `GET /admin/settings/business-limit`, `GET /admin/dashboard/analytics` | Ringkasan admin: 5 kartu angka, 6 chart (toko per industri, distribusi status kesehatan, tren submission 12 bulan, tren user baru 12 bulan, rata-rata omzet per industri, user aktif vs suspended), dan tombol coba lagi saat load gagal. |
| `/admin/diagnosis` | `AdminDiagnosisPage` | `DashboardShell`, tabel diagnosis, `PaginationControls` | Yes | `admin` | `GET /admin/businesses?limit=100&offset=0`, `GET /admin/diagnosis-watchlist` | Tabel Monitoring Diagnosis (toko skor terendah lebih dulu) dengan pagination, tombol aksi Sub Skor/Lihat Input per baris (tombol "Dashboard" dihapus karena sudah digabung ke Sub Skor), tombol Laporan Kesehatan Bisnis jika omzet 6 bulan di atas threshold, dan tombol coba lagi saat load gagal. |
| `/admin/limit` | `AdminLimitPage` | `DashboardShell`, form limit toko/user | Yes | `admin` | `GET /admin/settings/business-limit`, `PATCH /admin/settings/business-limit` | Form ubah limit jumlah toko per user. |
| `/admin/users` | `AdminUsersPage` | `DashboardShell`, tabel user, `PaginationControls`, confirmation dialog | Yes | `admin` | `GET /admin/users`, `PATCH /admin/users/:id/status`, `PATCH /admin/users/:id/email/verify` | Tabel user dengan pagination, update status user (selain akun admin sendiri), badge email verified, dan verifikasi manual email dengan konfirmasi. |
| `/admin/audit-log` | `AdminAuditLogPage` | `DashboardShell`, panel audit log, `PaginationControls` | Yes | `admin` | `GET /admin/audit-logs` | Panel audit log dengan pagination, search/filter server-side, dan detail expand. |
| `/admin/businesses/:businessId/inventory-input` | `AdminInventoryDetailPage` | `DashboardShell`, inventory readout | Yes | `admin` | `GET /admin/businesses/:id`, `GET /admin/businesses/:id/inventory-submissions/latest`, `GET /admin/users?limit=100&offset=0` | Detail input inventarisasi user untuk business tertentu dari monitoring admin, dengan tombol ke Sub Skor dan Laporan Kesehatan Bisnis. Kartu ringkasan sudah dihapus dari halaman ini — dipindah ke Business Snapshot di `/sub-scores`. |
| `/admin/businesses/:businessId/health-report` | `AIReportPage` | `DashboardShell`, `AIReportChart`, export buttons | Yes | `admin` | `GET /admin/businesses/:id/health-report`, `POST /admin/businesses/:id/health-report/regenerate` | Laporan Kesehatan Bisnis untuk business tertentu dari monitoring admin. |

## Fallback

| Route | Halaman | Komponen Utama | Auth | Role | API yang Digunakan | Fungsi |
| --- | --- | --- | --- | --- | --- | --- |
| `*` | `Navigate` | `Navigate` | No | Public | Tidak ada | Redirect semua route tidak dikenal ke `/`. |
