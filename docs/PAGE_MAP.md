# Page Map

## Public

| Route | Halaman | Komponen Utama | Auth | Role | API yang Digunakan | Fungsi |
| --- | --- | --- | --- | --- | --- | --- |
| `/` | `LandingPage` | `LandingHero`, `Brand`, `Button`, `Icon` | No | Public | Tidak ada | Landing page marketing/preview dashboard. |
| `/login` | `LoginPage` | `Brand`, `Button`, `Icon`, `AuthContext.login` | No | Public | `POST /auth/login` | Login user/admin, simpan session, redirect berdasarkan role atau route asal. |
| `/register` | `RegisterPage` | `Brand`, `Button`, `Icon`, `AuthContext.register` | No | Public | `POST /auth/register` | Registrasi user baru, simpan session, redirect berdasarkan role. |

## Protected Umum

Route ini memakai `RequireAuth`. Admin dan user bisa mengakses, tetapi data API yang dipakai berbeda pada sebagian halaman.

| Route | Halaman | Komponen Utama | Auth | Role | API yang Digunakan | Fungsi |
| --- | --- | --- | --- | --- | --- | --- |
| `/businesses/:businessId/dashboard` | `DashboardPage` | `DashboardShell`, `ScoreCard`, `TrendChart`, `RadarProfile` | Yes | `admin`, `user` | User: `GET /businesses/:id`, `GET /businesses/:id/inventory-submissions/latest`; Admin: `GET /admin/businesses/:id`, `GET /admin/businesses/:id/inventory-submissions/latest` | Dashboard diagnosis toko dengan skor keseluruhan, sub-score ringkas, action plan, dan snapshot bisnis. |
| `/businesses/:businessId/score` | `ScoreResultPage` | `DashboardShell`, score hero, action buttons | Yes | `admin`, `user` | User: `GET /businesses/:id`, `GET /businesses/:id/inventory-submissions/latest`; Admin: `GET /admin/businesses/:id`, `GET /admin/businesses/:id/inventory-submissions/latest` | Halaman hasil skor keseluruhan dan insight dimensi terkuat/prioritas. |
| `/businesses/:businessId/sub-scores` | `SubScoresPage` | `DashboardShell`, subscore cards, radar SVG, bar chart | Yes | `admin`, `user` | User: `GET /businesses/:id`, `GET /businesses/:id/inventory-submissions/latest`; Admin: `GET /admin/businesses/:id`, `GET /admin/businesses/:id/inventory-submissions/latest` | Detail enam sub-skor bisnis dan legend interpretasi skor. |
| `/businesses/:businessId/inventory/new` | `InventoryPage` | `DashboardShell`, `TextField`, confirmation dialog | Yes | `admin`, `user` | `GET /businesses/:id`, `GET /businesses/:id/inventory-submissions/latest`, `POST /businesses/:id/inventory-submissions` | Form inventarisasi business-scoped; menyimpan draft lokal dan submit ke backend. |
| `/businesses/:businessId/analysis` | `AnalysisPage` | Progress ring, step list, `Button` | Yes | `admin`, `user` | Tidak ada | Simulasi animasi analisis 5.2 detik lalu tombol ke score result. |
| `/settings` | `SettingsPage` | `DashboardShell`, `ThemeCustomizer` | Yes | `admin`, `user` | Tidak ada | Pengaturan tema lokal warna/dark mode. |
| `/dashboard` | `Navigate` | `Navigate` | Yes | `admin`, `user` | Tidak ada | Redirect ke `/businesses`. |
| `/inventory` | `Navigate` | `Navigate` | Yes | `admin`, `user` | Tidak ada | Redirect ke `/businesses`. |
| `/analysis` | `Navigate` | `Navigate` | Yes | `admin`, `user` | Tidak ada | Redirect ke `/businesses`. |

## User-Only

Route ini memakai `RequireAuth userOnly`. Admin diarahkan ke `/admin`.

| Route | Halaman | Komponen Utama | Auth | Role | API yang Digunakan | Fungsi |
| --- | --- | --- | --- | --- | --- | --- |
| `/businesses` | `BusinessesPage` | `DashboardShell`, business cards, business create form, industry combobox | Yes | `user` | `GET /businesses`, `GET /settings/business-limit`, `GET /businesses/:id/inventory-submissions/latest`, `POST /businesses` | Daftar toko user, status inventory tiap toko, business limit, dan tambah toko baru. |

## Admin-Only

Route ini memakai `RequireAuth adminOnly`. User non-admin diarahkan ke `/businesses`.

| Route | Halaman | Komponen Utama | Auth | Role | API yang Digunakan | Fungsi |
| --- | --- | --- | --- | --- | --- | --- |
| `/admin` | `AdminPage` | `DashboardShell`, admin metrics, diagnosis table, users list, audit logs, pagination, confirmation dialog | Yes | `admin` | `GET /admin/dashboard/summary`, `GET /admin/settings/business-limit`, `PATCH /admin/settings/business-limit`, `GET /admin/users`, `PATCH /admin/users/:id/status`, `GET /admin/businesses`, `GET /admin/diagnosis-watchlist`, `GET /admin/audit-logs` | Dashboard admin untuk monitoring operasional, limit toko, user status, diagnosis watchlist, dan audit logs. |
| `/admin/businesses/:businessId/inventory-input` | `AdminInventoryDetailPage` | `DashboardShell`, inventory readout, summary cards | Yes | `admin` | `GET /admin/businesses/:id`, `GET /admin/businesses/:id/inventory-submissions/latest`, `GET /admin/users?limit=100&offset=0` | Detail input inventarisasi user untuk business tertentu. |

## Fallback

| Route | Halaman | Komponen Utama | Auth | Role | API yang Digunakan | Fungsi |
| --- | --- | --- | --- | --- | --- | --- |
| `*` | `Navigate` | `Navigate` | No | Public | Tidak ada | Redirect semua route tidak dikenal ke `/`. |
