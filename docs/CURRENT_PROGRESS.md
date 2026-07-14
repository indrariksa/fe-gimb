# Current Progress

Dokumen ini mencatat kondisi source code frontend `fe-gimb` saat ini. Jangan menganggap build/test berhasil kecuali bagian verifikasi menyebut perintah yang benar-benar dijalankan.

## Fitur yang Sudah Terimplementasi

- React/Vite SPA dengan BrowserRouter.
- Landing page untuk Smart Business Dashboard.
- Login dan register.
- Session auth di `localStorage` key `gimb:auth`.
- Refresh token saat bootstrap aplikasi.
- API client fetch wrapper dengan timeout 15 detik, auth header, envelope parsing, dan 401 handler.
- Route guard authenticated, admin-only, dan user-only.
- Redirect role:
  - admin ke `/admin`;
  - user ke `/businesses`.
- DashboardShell untuk halaman authenticated:
  - sidebar desktop/mobile;
  - collapse sidebar lokal;
  - role-based navigation;
  - theme toggle;
  - logout confirmation.
- Daftar toko user.
- Create toko dengan validasi lokal dan business limit dari backend.
- Status inventory tiap toko melalui latest inventory check.
- Form inventarisasi business-scoped.
- Draft inventory per business di localStorage.
- Confirmation dialog submit inventory.
- Analysis progress page berbasis timer lokal.
- Score result page.
- Dashboard diagnosis dengan score ring, score cards, action plan, dan business snapshot.
- Sub-scores page dengan card, radar SVG, bar chart, dan legend.
- Settings page untuk warna tema lokal.
- Theme provider dengan dark/light mode, OS preference initial mode, CSS variable colors, dan document title.
- Admin dashboard:
  - summary metrics;
  - diagnosis watchlist dengan pagination;
  - update business limit;
  - user list dan update status;
  - audit log list dengan pagination, search/filter lokal, detail expand, reload, fullscreen.
- Admin inventory detail/input readout page.
- TypeScript type kontrak API di `src/services/api/types.ts`.
- Responsive styling di `global.css`.
- Beberapa atribut ARIA untuk dialog, menu, pagination, icons, timeout alert.
- Vercel SPA rewrite.

## Halaman yang Sudah Tersedia

- `/`
- `/login`
- `/register`
- `/businesses`
- `/businesses/:businessId/dashboard`
- `/businesses/:businessId/score`
- `/businesses/:businessId/sub-scores`
- `/businesses/:businessId/inventory/new`
- `/businesses/:businessId/analysis`
- `/settings`
- `/admin`
- `/admin/businesses/:businessId/inventory-input`

Redirect/fallback:

- `/dashboard` -> `/businesses`
- `/inventory` -> `/businesses`
- `/analysis` -> `/businesses`
- `*` -> `/`

## Fitur yang Tampak Sedang Dikerjakan atau Lokal/Sementara

- Theme settings masih lokal dan copy menyebut siap disambungkan ke backend.
- Landing page masih punya copy "Form Inventarisasi ... siap disimpan lokal sebelum integrasi backend", padahal form inventory sekarang memanggil backend.
- Tombol `Rekomendasi`, export `Excel/PDF`, dan `Upgrade Plan` terlihat sebagai UI tetapi belum ditemukan aksi nyata.
- Service `listBusinessInventories` dan `adminInventorySubmissions` tersedia, tetapi belum ditemukan pemakaian di halaman.
- Admin audit search/filter bekerja pada audit log yang sudah dimuat untuk halaman saat ini, bukan query server-side.

## TODO yang Ditemukan

Tidak ditemukan marker `TODO`, `FIXME`, `HACK`, atau `XXX` di source frontend.

Catatan penting yang ditemukan:

- Tidak ada field `scoring_version` di type `BusinessHealthAnalysis` frontend.
- `AdminPage.updateStatus` tidak memiliki try/catch lokal saat update user status.
- `AdminInventoryDetailPage` mencari submitter dari `adminUsers({ limit: 100, offset: 0 })`, sehingga user di luar 100 pertama bisa tidak ditemukan.

## Test atau Build yang Tersedia

Script tersedia di `package.json`:

```bash
npm run dev
npm run build
npm run preview
```

Script lint: Belum teridentifikasi.

Script test: Belum teridentifikasi.

File test/spec: Belum teridentifikasi.

## Verifikasi Saat Dokumen Ini Dibuat

Belum dijalankan build production (`npm run build`) karena perintah itu menulis output ke `dist`, sementara tugas ini hanya membaca/menganalisis dan membuat dokumentasi.

Pemeriksaan yang dijalankan:

```bash
./node_modules/.bin/tsc --noEmit
```

Hasil: exit code `0`.

## Risiko atau Bagian yang Perlu Dikonfirmasi

- Apakah `scoring_version` perlu menjadi kontrak frontend atau tetap internal backend.
- Apakah landing copy lama tentang integrasi backend masih diinginkan.
- Apakah tombol export PDF/Excel perlu implementasi nyata atau memang placeholder UI.
- Apakah audit search/filter perlu server-side agar mencari seluruh log.
- Apakah session harus mencoba refresh otomatis saat access token expired, bukan langsung logout pada 401.
- Apakah admin inventory detail perlu endpoint submitter/detail user daripada mengambil 100 user pertama.
- Apakah perlu test runner/lint formal untuk CI.
