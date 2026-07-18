# Current Progress

Terakhir diperbarui: 18 Juli 2026

Dokumen ini mencatat kondisi source code frontend `fe-gimb` saat ini. Jangan menganggap build/test berhasil kecuali bagian verifikasi menyebut perintah yang benar-benar dijalankan.

## Fitur yang Sudah Terimplementasi

- React/Vite SPA dengan BrowserRouter.
- Landing page untuk Smart Business Dashboard.
- Login email-password dan register email-password dengan verifikasi email; register mengikuti response backend yang membuat token lalu mengirim email di background via Resend API atau SMTP, dan retry register untuk akun belum verified dengan password yang sama mengikuti response sukses backend sebagai recovery email verifikasi.
- Halaman verifikasi email `/verify-email` dengan deduplicate request per token, retry sekali untuk `404` sesaat, CTA login yang membawa email agar field login otomatis terisi, countdown resend dari response backend, dan `retry_after_seconds` saat `429`.
- Halaman sukses registrasi `/registration-success` dengan resend email verification, countdown dari response backend, dan `retry_after_seconds` saat `429`.
- Login/register Google via Google Identity Services jika `VITE_GOOGLE_CLIENT_ID` diisi.
- Setup password akun Google-only dan ubah password mandiri dari halaman settings.
- Session auth di `localStorage` key `gimb:auth`.
- Lazy refresh token saat bootstrap aplikasi jika access token expired atau hampir expired.
- API client fetch wrapper dengan timeout 15 detik, retry timeout sekali untuk request GET/HEAD, auth header, envelope parsing, refresh-on-401 sekali, dan unauthorized handler.
- Route guard authenticated, admin-only, user-only, dan loader sesi dengan spinner ringan.
- Loading state halaman/table memakai spinner reusable yang mengikuti tema.
- Redirect role:
  - admin ke `/admin`;
  - user ke `/businesses`.
- DashboardShell untuk halaman authenticated:
  - sidebar desktop/mobile;
  - collapse sidebar lokal;
  - role-based navigation termasuk menu user Hasil Input ke detail data inventarisasi;
  - theme toggle;
  - logout confirmation.
- Daftar toko user.
- Halaman user utama menyediakan tombol coba lagi saat load data gagal.
- Create toko dengan validasi lokal dan business limit dari backend.
- Status inventory tiap toko melalui latest inventory check.
- Detail data inventarisasi untuk user dari dashboard toko dan daftar toko.
- Form inventarisasi business-scoped.
- Draft inventory per business di localStorage.
- Confirmation dialog submit inventory.
- Analysis progress page berbasis timer lokal.
- Score result page.
- Dashboard diagnosis dengan score ring, score cards, action plan 30 hari dari `analysis.action_plan`, business snapshot, dan insight cards yang readable di light/dark mode.
- Sub-scores page dengan card, radar SVG, bar chart, insight operasional inventory termasuk sisa margin, dan legend.
- Export PDF report berbasis data dan XLSX rapi yang berbeda untuk dashboard summary dan sub-scores detailed analysis.
- Settings page untuk setup/ubah password mandiri dan warna tema lokal.
- Theme provider dengan dark/light mode, OS preference initial mode, CSS variable colors, document title, dan toggle tema di landing/login/register.
- Admin dashboard:
  - summary metrics;
  - efek holographic ringan pada card summary;
  - diagnosis watchlist dengan pagination;
  - update business limit;
  - user list dengan pagination, update status, urutan user biasa terbaru lebih dulu, dan admin paling akhir;
  - audit log list dengan pagination, search/filter server-side, detail expand, reload seamless, fullscreen, dan kolom row rata kiri;
  - tombol coba lagi pada error state utama, monitoring diagnosis, user list, dan audit log.
- Admin bell notification:
  - load recent notifications;
  - unread count;
  - mark one/read all;
  - WebSocket realtime dengan reconnect sederhana.
- Admin inventory detail/input readout page.
- SVG favicon dan brand mark aplikasi melalui `public/gimb-icon.svg`.
- TypeScript type kontrak API di `src/services/api/types.ts`.
- Responsive styling di `global.css`.
- Beberapa atribut ARIA untuk dialog, menu, pagination, icons, timeout alert.
- Vercel SPA rewrite.

## Halaman yang Sudah Tersedia

- `/`
- `/login`
- `/register`
- `/registration-success`
- `/verify-email`
- `/businesses`
- `/businesses/:businessId/dashboard`
- `/businesses/:businessId/score`
- `/businesses/:businessId/sub-scores`
- `/businesses/:businessId/inventory-input`
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
- Tombol `Rekomendasi` dan `Upgrade Plan` terlihat sebagai UI tetapi belum ditemukan aksi nyata.
- Service `listBusinessInventories` dan `adminInventorySubmissions` tersedia, tetapi belum ditemukan pemakaian di halaman.
## TODO yang Ditemukan

Tidak ditemukan marker `TODO`, `FIXME`, `HACK`, atau `XXX` di source frontend.

Catatan penting yang ditemukan:

- Tidak ada field `scoring_version` di type `BusinessHealthAnalysis` frontend.
- `AdminPage.updateStatus` tidak memiliki try/catch lokal saat update user status.
- `AdminInventoryDetailPage` pada mode admin mencari submitter dari `adminUsers({ limit: 100, offset: 0 })`, sehingga user di luar 100 pertama bisa tidak ditemukan.

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

Pemeriksaan yang dijalankan:

```bash
node ./node_modules/typescript/bin/tsc --noEmit
cmd /c npm run build
```

Hasil: kedua perintah exit code `0`.

## Risiko atau Bagian yang Perlu Dikonfirmasi

- Apakah `scoring_version` perlu menjadi kontrak frontend atau tetap internal backend.
- Apakah landing copy lama tentang integrasi backend masih diinginkan.
- Apakah admin inventory detail perlu endpoint submitter/detail user daripada mengambil 100 user pertama.
- Apakah perlu test runner/lint formal untuk CI.
- WebSocket notification frontend mengirim access token di query string karena browser WebSocket native tidak mendukung custom Authorization header.
