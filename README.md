# GIMB Smart Business Dashboard Frontend

Frontend React Vite untuk landing page, autentikasi, daftar toko, input inventarisasi, proses analisis, dashboard skor kesehatan bisnis, pengaturan tema, dan admin dashboard.

## Stack

- React 19
- Vite 7
- TypeScript
- React Router
- CSS custom properties untuk tema terang/gelap dan warna brand

## Menjalankan Project

1. Install dependency:

```bash
npm install
```

2. Buat file `.env` dari contoh:

```bash
cp .env.example .env
```

3. Isi URL backend:

```env
VITE_API_BASE_URL=http://127.0.0.1:8080/api/v1
```

4. Jalankan development server:

```bash
npm run dev
```

5. Build production:

```bash
npm run build
```

## Route Utama

- `/` landing page
- `/login` login user/admin
- `/register` registrasi user baru
- `/businesses` daftar dan tambah toko
- `/businesses/:businessId/dashboard` dashboard diagnosis toko
- `/businesses/:businessId/score` halaman hasil skor kesehatan keseluruhan
- `/businesses/:businessId/sub-scores` halaman 6 sub skor bisnis
- `/businesses/:businessId/inventory/new` form input inventarisasi toko
- `/businesses/:businessId/analysis` animasi proses analisis setelah submit
- `/settings` pengaturan tema dan identitas aplikasi
- `/admin` dashboard admin, hanya untuk role `admin`

`businessId` memakai `public_id` dari backend, bukan UUID internal database.

## Integrasi Backend

Base URL diambil dari `VITE_API_BASE_URL`. Semua request protected otomatis membawa header:

```http
Authorization: Bearer <access_token>
```

Untuk production, domain frontend harus ikut dimasukkan ke `CORS_ALLOWED_ORIGINS` di backend. Jika tidak, browser akan memblokir request sebelum response API bisa dibaca.

Token disimpan sementara di `localStorage` dengan key `gimb:auth`. Saat aplikasi dibuka ulang, frontend mencoba refresh token melalui:

```http
POST /api/v1/auth/refresh
```

## Alur User

1. User login atau register.
2. User masuk ke `/businesses`.
3. User membuat atau memilih toko. Jumlah toko dibatasi oleh setting backend `business_limit_per_user`.
4. User mengisi inventarisasi di `/businesses/:businessId/inventory/new`.
5. Setelah klik `Simpan & Lanjutkan`, muncul dialog konfirmasi.
6. Jika disetujui, frontend mengirim data ke backend:

```http
POST /api/v1/businesses/:businessId/inventory-submissions
```

7. User diarahkan ke halaman analisis.
8. Setelah loading 100%, user masuk ke halaman hasil skor keseluruhan.
9. User dapat membuka detail 6 sub skor dari tombol `Lihat Sub Skor`.
9. Dashboard mengambil hasil terbaru dari:

```http
GET /api/v1/businesses/:businessId/inventory-submissions/latest
```

## Payload Inventarisasi

Form frontend mengikuti field dari `src/data/inventoryFields.ts`, lalu dikirim ke backend dalam format snake_case:

```json
{
  "six_month_revenue": 75000000,
  "six_month_transactions": 1800,
  "new_customers": 420,
  "repeat_customers": 760,
  "active_customers": 980,
  "cogs": 32000000,
  "operational_cost": 9500000,
  "salary_cost": 12000000,
  "marketing_cost": 4500000,
  "employee_count": 6,
  "asset_value": 90000000,
  "capital_investment": 70000000,
  "description": "Cashflow sering ketat di akhir bulan."
}
```

## Role

- `user`: mengelola toko miliknya, input inventarisasi, melihat dashboard.
- `admin`: memiliki akses user biasa ditambah `/admin` untuk memantau user, toko, dan submission.

Role dan status user berasal dari backend. Registrasi frontend membuat user biasa; admin sebaiknya dibuat/diubah dari Supabase sesuai catatan backend.

## Limit Toko

Frontend membaca batas toko per user dari backend:

```http
GET /api/v1/settings/business-limit
```

Response:

```json
{
  "key": "business_limit_per_user",
  "value": 2
}
```

Jika jumlah toko user sudah mencapai limit:

- tombol `Tambah Toko` di halaman `/businesses` menjadi disabled,
- form tambah toko terkunci,
- user diarahkan untuk memakai toko yang sudah ada.

Admin dapat mengubah limit dari halaman `/admin`, yang memanggil:

```http
PATCH /api/v1/admin/settings/business-limit
```

Body:

```json
{
  "value": 3
}
```

Validasi final tetap ada di backend saat `POST /api/v1/businesses`, jadi limit tidak hanya bergantung pada UI.

## Struktur Penting

- `src/services/api` berisi API client dan service per domain.
- `src/context/AuthContext.tsx` mengelola sesi login, refresh token, logout, dan state user.
- `src/components/guards/RequireAuth.tsx` menjaga route protected dan admin-only.
- `src/components/organisms/DashboardShell.tsx` layout dashboard, sidebar, header, theme toggle, logout.
- `src/pages` berisi halaman fitur utama.
- `src/theme` menyimpan pengaturan tema lokal.
- `src/data/inventoryFields.ts` menjadi acuan field input inventarisasi.

## Catatan Pengembangan

- Gunakan `public_id` dari backend untuk URL toko dan submission.
- Jangan memakai UUID internal database di route frontend.
- Jika backend mengembalikan `401`, frontend akan menghapus sesi lokal dan user perlu login ulang.
- Pengaturan tema saat ini masih lokal agar mudah dipindahkan ke backend nanti.
