# Project Context

Dokumen ini adalah snapshot konteks frontend `fe-gimb` berdasarkan source code dan konfigurasi aktual. Source of truth utama tetap source code, `package.json`, `package-lock.json`, dan konfigurasi di repository ini.

## Gambaran Umum

`fe-gimb` adalah frontend React/Vite untuk GIMB Smart Business Dashboard. Aplikasi menyediakan landing page, autentikasi user/admin, ubah password mandiri, daftar toko, form inventarisasi bisnis, detail data inventarisasi, simulasi proses analisis, dashboard hasil diagnosis, halaman skor, halaman sub-skor, pengaturan tema, dan admin dashboard.

## Tujuan Aplikasi

Tujuan utama frontend:

- memberi alur user untuk login/register, membuat atau memilih toko, mengisi inventarisasi, dan melihat hasil diagnosis bisnis;
- memberi admin dashboard untuk memantau user, toko, diagnosis, audit log, dan limit toko per user;
- menyajikan analisis kesehatan bisnis dari backend dalam UI dashboard yang responsif;
- menyimpan session dan preferensi UI lokal agar pengalaman pengguna tetap berlanjut setelah reload.

## Teknologi

Versi dari `package.json` dan versi ter-resolve dari `package-lock.json`:

| Komponen | Range package.json | Resolved lockfile |
| --- | --- | --- |
| React | `^19.0.0` | `19.2.7` |
| React DOM | `^19.0.0` | `19.2.7` |
| React Router DOM | `^7.18.0` | `7.18.0` |
| Vite | `^7.0.0` | `7.3.5` |
| TypeScript | `^5.8.0` | `5.9.3` |
| @vitejs/plugin-react | `^5.0.0` | `5.2.0` |
| @types/react | `^19.2.17` | `19.2.17` |
| @types/react-dom | `^19.2.3` | `19.2.3` |

Konfigurasi:

- `vite.config.ts`: memakai plugin React, tanpa konfigurasi custom lain.
- `tsconfig.json`: `strict: true`, `jsx: react-jsx`, `moduleResolution: bundler`, `noEmit: true`.
- `vercel.json`: rewrite semua path ke `/index.html` untuk SPA routing.

## Struktur Folder

| Path | Fungsi |
| --- | --- |
| `src/main.tsx` | Entry point React, render `<App />` dan import CSS global. |
| `src/App.tsx` | Provider dan routing utama. |
| `src/pages` | Halaman fitur utama. |
| `src/components/atoms` | Komponen kecil: `Button`, `Icon`, `TextField`. |
| `src/components/molecules` | Komponen menengah: `Brand`, `ScoreCard`, `ThemeCustomizer`. |
| `src/components/organisms` | Layout/visual besar: `DashboardShell`, `LandingHero`, `RadarProfile`, `TrendChart`. |
| `src/components/guards` | Route guard `RequireAuth`. |
| `src/context` | `AuthContext` untuk session/auth state. |
| `src/theme` | Theme context, default theme, CSS variable applier. |
| `src/services/api` | HTTP client, service per domain, dan type kontrak API. |
| `src/data` | Data statis dashboard fallback dan field inventarisasi. |
| `src/utils` | Helper validasi form dan angka. |
| `src/utils/exportReport.ts` | Helper export report PDF berbasis data dan workbook XLSX dengan format Rupiah. |
| `src/styles/global.css` | Semua styling global, layout, responsive, dark mode. |
| `public/gimb-icon.svg` | Ikon SVG ringan untuk favicon browser dan brand mark aplikasi. |

## Arsitektur Frontend

Arsitektur sederhana berbasis React component:

```text
main.tsx -> App.tsx -> ThemeProvider -> AuthProvider -> BrowserRouter -> Routes -> Pages -> API services
```

Pola utama:

- routing berada di `App.tsx`;
- proteksi route berada di `RequireAuth`;
- session berada di `AuthContext`;
- tema berada di `ThemeContext`;
- API call dikelompokkan di `src/services/api`;
- halaman menyimpan state lokal dengan `useState`, `useEffect`, dan `useMemo`;
- tidak ada global state library selain React Context.

## Entry Point

Entry point aplikasi:

```text
src/main.tsx
```

`main.tsx` melakukan:

- import React dan ReactDOM;
- import `App`;
- import `src/styles/global.css`;
- render `<App />` dalam `<React.StrictMode>`.

## Routing

Routing memakai `BrowserRouter`, `Routes`, `Route`, `Navigate`, dan nested guard route dari `react-router-dom`.

Public route:

- `/`
- `/login`
- `/register`

Protected route umum:

- `/businesses/:businessId/dashboard`
- `/businesses/:businessId/score`
- `/businesses/:businessId/sub-scores`
- `/businesses/:businessId/inventory-input`
- `/businesses/:businessId/inventory/new`
- `/businesses/:businessId/analysis`
- `/settings`
- `/dashboard` redirect ke `/businesses`
- `/inventory` redirect ke `/businesses`
- `/analysis` redirect ke `/businesses`

User-only route:

- `/businesses`

Admin-only route:

- `/admin`
- `/admin/businesses/:businessId/inventory-input`

Fallback:

- `*` redirect ke `/`.

Detail halaman ada di `docs/PAGE_MAP.md`.

## Layout dan Navigasi

Layout utama aplikasi authenticated memakai `DashboardShell`:

- sidebar desktop/mobile;
- sidebar collapse state disimpan di `localStorage` key `gimb:sbd:sidebar-collapsed`;
- topbar dengan title, menu mobile, dark/light toggle, bell icon, user chip;
- logout confirmation dialog;
- navigation user atau admin berdasarkan role.

Navigasi user:

- Daftar Toko;
- Dashboard;
- Hasil Skor;
- Sub Skor;
- Hasil Input;
- Input Masalah.

Navigasi admin:

- Ringkasan;
- Diagnosis;
- Limit;
- User;
- Audit Log.

User navigation untuk dashboard/score/subscore/hasil input disabled jika belum ada `businessId` atau belum ada hasil inventory. DashboardShell mengecek hasil inventory terbaru lewat endpoint latest inventory.

## Autentikasi

Autentikasi frontend berada di `src/context/AuthContext.tsx` dan `src/services/api/auth.ts`.

Alur:

1. Login/register memanggil API auth.
2. Response auth diubah ke local shape `{ user, accessToken, refreshToken }`.
3. Data disimpan di `localStorage` key `gimb:auth`.
4. Saat bootstrap, frontend memakai access token tersimpan jika token masih valid.
5. Jika access token kosong, rusak, expired, atau akan expired dalam 60 detik, frontend memanggil `/auth/refresh`.
6. API client dikonfigurasi dengan provider access token, refresh-on-401 sekali, dan handler unauthorized/timeout.
7. Jika response protected mendapat `401`, API client mencoba refresh token dan retry request asli sekali.
8. Jika refresh gagal selain timeout, session lokal dihapus dan user perlu login ulang.
9. Logout menghapus session lokal terlebih dahulu, lalu mencoba memanggil `/auth/logout`.

Ubah password mandiri berada di `SettingsPage` dan memakai `PATCH /me/password`. Form meminta password sekarang, password baru, dan konfirmasi password; session tetap aktif setelah berhasil.

Tidak ditemukan penggunaan cookie untuk auth.

## Role dan Proteksi Halaman

Role dari type frontend:

- `admin`;
- `user`.

Status user dari type frontend:

- `active`;
- `inactive`;
- `suspended`.

Proteksi route:

- `RequireAuth` menampilkan loader saat `isLoading`.
- Jika belum login, redirect ke `/login` dengan state `{ from: location.pathname }`.
- `adminOnly` dan bukan admin redirect ke `/businesses`.
- `userOnly` dan admin redirect ke `/admin`.

Redirect tambahan:

- Login/Register jika sudah authenticated redirect ke `/admin` untuk admin atau `/businesses` untuk user.
- Login setelah sukses memakai `location.state.from` jika ada dan bukan `/login`; fallback berdasarkan role.

## State Management

State management yang digunakan:

- React local state (`useState`) untuk form, loading, error, pagination, filter, dialog, dan data halaman.
- React Context:
  - `AuthContext` untuk session user/token;
  - `ThemeContext` untuk tema dan preferensi tampilan.
- `localStorage`:
  - `gimb:auth` untuk session auth;
  - `gimb:sbd:theme` untuk tema;
  - `gimb:sbd:sidebar-collapsed` untuk sidebar;
  - `gimb:sbd:inventory:<businessId>` untuk draft form inventory per toko.

Tidak ditemukan Redux, Zustand, React Query, atau state library lain.

## Integrasi API

Base URL:

- `import.meta.env.VITE_API_BASE_URL`;
- fallback `http://127.0.0.1:8080/api/v1`.

HTTP client:

- `src/services/api/client.ts`;
- wrapper `fetch`;
- timeout `15_000` ms via `AbortSignal.timeout`;
- envelope API: `ApiEnvelope<T>`.

Header auth:

- Jika `options.auth !== false`, client mengambil access token dari provider dan menambahkan:

```http
Authorization: Bearer <accessToken>
```

Error handling:

- `ApiError` untuk non-OK response atau envelope `success === false`;
- `ApiTimeoutError` untuk timeout;
- `getFriendlyApiError` memberi pesan khusus untuk 429, 413, >=500, dan network `TypeError`;
- `401` pada protected request mencoba refresh token dan retry request sekali sebelum session lokal dihapus;
- timeout memunculkan notice global `role="alert"` selama 5 detik.

Tidak ada interceptor library seperti Axios. Pola interceptor dibuat manual melalui `configureApiClient`.

Peta endpoint ada di `docs/API_INTEGRATION_MAP.md`.

## Form dan Validasi

Validasi yang teridentifikasi:

- Login: HTML `type=email`, `required`, password `required minLength=8`.
- Register: nama/email/password required; password `minLength=8`; email `type=email`.
- Ubah password: semua field required, password baru minimal 8 karakter, konfirmasi harus sama, dan password baru harus berbeda dari password sekarang.
- Business create:
  - `cleanText`;
  - `validateRequiredText` untuk nama toko dan industri;
  - `validateMaxLength` deskripsi 500;
  - pesan error lokal ditampilkan di `.form-error`.
- Inventory:
  - input numeric menyimpan digits only;
  - format tampilan memakai separator titik;
  - `six_month_revenue` dan `six_month_transactions` wajib > 0;
  - customer count tidak boleh negatif;
  - deskripsi maksimal 1000;
  - confirmation dialog sebelum submit.
- Admin business limit:
  - input `type=number`, `min=1`, `max=100`;
  - confirmation dialog sebelum submit.
- ThemeCustomizer:
  - input color native.

Backend tetap menjadi validasi final.

## Styling, Tema, Responsiveness, dan Aksesibilitas

Styling:

- satu CSS global besar di `src/styles/global.css`;
- CSS custom properties untuk warna, surface, font, shadow, dark mode;
- `HolographicCard` memakai event mouse ringan dan CSS variable untuk efek tilt/glow pada card ringkasan admin dan user, dengan fallback `prefers-reduced-motion`;
- SVG `public/gimb-icon.svg` dipakai sebagai favicon browser dan brand mark di komponen `Brand`;
- font diimport dari Google Fonts di CSS;
- class naming dominan BEM-ish seperti `block__element--modifier`;
- panel/card/button class digunakan lintas halaman.

Tema:

- `ThemeContext` membaca local theme atau OS preference dark mode;
- `applyTheme` mengubah `document.documentElement.dataset.theme`;
- CSS dark mode memakai `:root[data-theme="dark"]`;
- warna user-settable: primary, accent, success, warning;
- `readableTextColor` menghitung warna teks kontras untuk beberapa warna.

Responsiveness:

- breakpoint CSS teridentifikasi:
  - `@media (max-height: 780px) and (min-width: 861px)`;
  - `@media (max-width: 1180px)`;
  - `@media (max-width: 860px)`;
  - `@media (max-width: 560px)`;
- sidebar mobile memakai backdrop dan tombol menu;
- layout dashboard/admin/form berubah di breakpoint.

Aksesibilitas yang terlihat:

- SVG icon memakai `aria-hidden="true"`;
- tombol menu/dialog/filter punya `aria-label`;
- confirmation dialog memakai `role="dialog"`, `aria-modal`, `aria-labelledby`;
- timeout notice memakai `role="alert"` dan `aria-live="assertive"`;
- pagination size menu memakai `role=listbox`/`role=option`;
- beberapa decorative visual memakai `aria-hidden`;
- focus style tersedia di CSS untuk input/menu/sidebar.

Belum ditemukan audit aksesibilitas otomatis.

## Environment Variable

Environment variable frontend:

| Key | Fungsi |
| --- | --- |
| `VITE_API_BASE_URL` | Base URL backend API, contoh path berakhir di `/api/v1`. |

Jangan menuliskan nilai rahasia. Tidak ditemukan env frontend lain.

## Perintah Development, Build, Lint, dan Test

Script dari `package.json`:

```bash
npm run dev
npm run build
npm run preview
```

Makna script:

- `dev`: `vite --host 0.0.0.0`;
- `build`: `vite build`;
- `preview`: `vite preview --host 0.0.0.0`.

Script lint: Belum teridentifikasi.

Script test: Belum teridentifikasi.

## Fitur Terimplementasi

- Landing page.
- Login/register dengan redirect role.
- Session persistence, lazy refresh token saat bootstrap, dan refresh-on-401 sekali.
- Route guard user/admin.
- User business list/create dengan business limit.
- Pengecekan inventory existing per business.
- Draft inventory lokal per business.
- Submit inventory ke backend.
- Detail data inventarisasi bisa dibuka user dari dashboard toko dan daftar toko.
- Analysis loading page berbasis timer/progress lokal.
- Score result page.
- Dashboard diagnosis dengan score cards, action plan 30 hari dari `analysis.action_plan`, dan business snapshot.
- Sub-scores page dengan card, radar SVG, bar chart, insight operasional dari data inventarisasi, dan legend.
- Export PDF report berbasis data dan workbook XLSX rapi untuk dashboard summary dan sub-scores analysis.
- Settings page untuk ubah password mandiri dan tema lokal.
- Admin dashboard summary.
- Card ringkasan admin dan user memakai efek holographic ringan saat hover.
- Admin monitoring diagnosis dengan pagination.
- Admin update business limit.
- Admin user list dan update status.
- Admin audit log list dengan pagination, filter level, search lokal per halaman, expand detail, reload, fullscreen.
- Admin inventory input/detail page.
- Dark/light mode dan theme colors.

## Pola Kode yang Harus Dipertahankan

- Tambahkan route di `App.tsx` dan proteksi lewat `RequireAuth` sesuai role.
- API call baru diletakkan di service domain dalam `src/services/api`.
- Type kontrak API ditambahkan di `src/services/api/types.ts`.
- Gunakan `apiRequest<T>` agar auth header, timeout, envelope, refresh-on-401, dan unauthorized handling konsisten.
- Untuk error user-facing, gunakan `getFriendlyApiError` pada form/action penting.
- Gunakan `public_id` business di URL, bukan UUID internal.
- Simpan state UI lokal di context/localStorage hanya jika memang preferensi/draft lokal.
- Pertahankan `DashboardShell` untuk halaman authenticated.
- Pertahankan field inventory dari `src/data/inventoryFields.ts` sebagai sumber label/form order.
- Pertahankan CSS custom properties dan dark mode `data-theme`.
- Jangan menambahkan dependency untuk kebutuhan yang sudah ditangani native/React sederhana.

## Bagian Belum Teridentifikasi / Perlu Dikonfirmasi

- Test runner dan test file belum teridentifikasi.
- Lint script belum teridentifikasi.
- Tidak ada client-side schema validation library; validasi masih helper sederhana dan HTML validation.
- Tidak ditemukan penyimpanan tema ke backend; tema saat ini lokal.
- Landing page copy masih menyebut form inventarisasi siap disimpan lokal sebelum integrasi backend, padahal fitur inventory sudah memanggil backend. Perlu dikonfirmasi apakah copy masih diinginkan.
- Tombol `Rekomendasi` dan `Upgrade Plan` belum terlihat memiliki implementasi aksi nyata selain tampilan tombol.
- Search audit log berlaku pada data halaman audit yang sedang dimuat, bukan seluruh server-side result.
- Halaman detail inventory memakai endpoint admin saat dibuka admin dan endpoint user saat dibuka user; mode admin masih mengambil `adminUsers({ limit: 100 })` untuk mencari submitter, sehingga user di luar 100 pertama bisa tidak ditemukan.
- `BusinessHealthAnalysis` frontend belum memiliki field `scoring_version`.
