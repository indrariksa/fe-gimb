# Current Progress

Terakhir diperbarui: 4 Agustus 2026

Dokumen ini mencatat kondisi source code frontend `fe-gimb` saat ini. Jangan menganggap build/test berhasil kecuali bagian verifikasi menyebut perintah yang benar-benar dijalankan.

## Fitur yang Sudah Terimplementasi

- React/Vite SPA dengan BrowserRouter.
- Landing page untuk Smart Business Dashboard.
- Login email-password dan register email-password dengan verifikasi email; register mengikuti response backend yang membuat token lalu mengirim email di background via Resend API atau SMTP, dan retry register untuk akun belum verified dengan password yang sama mengikuti response sukses backend sebagai recovery email verifikasi.
- Halaman verifikasi email `/verify-email` dengan deduplicate request per token, retry sekali untuk `404` sesaat, CTA login yang membawa email agar field login otomatis terisi, countdown resend dari response backend, dan `retry_after_seconds` saat `429`.
- Halaman sukses registrasi `/registration-success` dengan resend email verification, countdown dari response backend, dan `retry_after_seconds` saat `429`.
- Login/register Google via Google Identity Services jika `VITE_GOOGLE_CLIENT_ID` diisi.
- Update nama profile, tautkan/lepas tautan Google, setup password akun Google-only, dan ubah password mandiri dari halaman settings.
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
- Settings page untuk update nama profile dengan konfirmasi, metode login readonly, tautkan atau lepas tautan Google dengan konfirmasi, guard agar akun Google-only membuat password dulu sebelum unlink, dan setup/ubah password mandiri dalam layout 50/50, lalu warna tema lokal tampil full-width dengan preview tema mini.
- Theme provider dengan dark/light mode, OS preference initial mode, CSS variable colors, document title, dan toggle tema di landing/login/register.
- Admin dashboard dipecah jadi 5 route/halaman terpisah (`AdminSummaryPage`, `AdminDiagnosisPage`, `AdminLimitPage`, `AdminUsersPage`, `AdminAuditLogPage`), masing-masing fetch data sendiri:
  - `AdminSummaryPage` (`/admin`): summary metrics, efek holographic ringan pada card summary, update business limit, 6 chart Chart.js (bar toko per industri dengan top-6 + "Lainnya" (bucket "Lainnya" dijumlah), doughnut distribusi status kesehatan, line tren submission 12 bulan dengan label bulan-tahun Indonesia, line tren user baru 12 bulan, bar rata-rata omzet per industri dengan top-6 + "Lainnya" (bucket "Lainnya" dirata-rata, bukan dijumlah, karena nilainya sudah berupa rata-rata) dan format Rupiah di tooltip/sumbu-Y, pie user aktif vs suspended), dan tombol coba lagi saat load gagal;
  - `AdminDiagnosisPage` (`/admin/diagnosis`): diagnosis watchlist dengan pagination dan tombol coba lagi;
  - `AdminLimitPage` (`/admin/limit`): update business limit;
  - `AdminUsersPage` (`/admin/users`): user list dengan pagination, update status selain akun admin sendiri, badge email verified, verifikasi manual email dengan konfirmasi, urutan user biasa terbaru lebih dulu, dan admin paling akhir;
  - `AdminAuditLogPage` (`/admin/audit-log`): audit log list dengan pagination, search/filter server-side, detail expand, reload seamless, fullscreen, dan kolom row rata kiri, dengan tombol coba lagi.
- Admin bell notification:
  - load recent notifications;
  - unread count;
  - mark one/read all;
  - WebSocket realtime dengan reconnect sederhana;
  - dropdown dan toast menampilkan waktu notifikasi di kanan judul dengan format relatif lalu tanggal/jam Asia/Jakarta untuk data lama.
- Admin inventory detail/input readout page.
- Laporan bisnis AI `/businesses/:businessId/ai-report` (dan versi admin `/admin/businesses/:businessId/ai-report`): polling status processing/ready/failed, narasi per sub-skor dengan score drivers dan alternative solutions, chart bar/line/radar/pie/gauge (`AIReportChart`), export PDF/XLSX reuse `downloadPdfReport`/`downloadWorkbook`, dan tombol generate ulang saat status gagal.
- SVG favicon dan brand mark aplikasi melalui `public/gimb-icon.svg`.
- TypeScript type kontrak API di `src/services/api/types.ts`.
- Helper tanggal/jam terpusat `src/utils/dateTime.ts` memformat tampilan manusia dengan timezone eksplisit `Asia/Jakarta`.
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
- `/businesses/:businessId/ai-report`
- `/settings`
- `/admin`
- `/admin/diagnosis`
- `/admin/limit`
- `/admin/users`
- `/admin/audit-log`
- `/admin/businesses/:businessId/inventory-input`
- `/admin/businesses/:businessId/ai-report`

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
- `AdminUsersPage.updateStatus` tidak memiliki try/catch lokal saat update user status.
- `AdminInventoryDetailPage` pada mode admin mencari submitter dari `adminUsers({ limit: 100, offset: 0 })`, sehingga user di luar 100 pertama bisa tidak ditemukan.
- Halaman laporan AI belum diverifikasi manual end-to-end di browser (empat state: not-eligible/processing/ready/failed) karena membutuhkan backend `be-gimb` hidup dengan `ANTHROPIC_API_KEY` terisi; baru diverifikasi lewat type-check dan build.

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
npm run build
```

Hasil: kedua perintah exit code `0`. Smoke test manual di browser (proses/ready/failed/not-eligible untuk laporan AI) belum dijalankan karena membutuhkan backend `be-gimb` hidup dengan `ANTHROPIC_API_KEY` terisi.

## Risiko atau Bagian yang Perlu Dikonfirmasi

- Apakah `scoring_version` perlu menjadi kontrak frontend atau tetap internal backend.
- Apakah landing copy lama tentang integrasi backend masih diinginkan.
- Apakah admin inventory detail perlu endpoint submitter/detail user daripada mengambil 100 user pertama.
- Apakah perlu test runner/lint formal untuk CI.
- WebSocket notification frontend mengirim access token di query string karena browser WebSocket native tidak mendukung custom Authorization header.
