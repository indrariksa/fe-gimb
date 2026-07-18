# API Integration Map

Base URL berasal dari `VITE_API_BASE_URL`, fallback `http://127.0.0.1:8080/api/v1`. Semua request memakai `apiRequest<T>` dari `src/services/api/client.ts`.

## Auth

| Fitur | File Service | Method | Endpoint | Request | Response | Penanganan Error |
| --- | --- | --- | --- | --- | --- | --- |
| Login | `src/services/api/auth.ts` | POST | `/auth/login` | `{ email, password }` | `AuthResponse` | `auth:false`; error dilempar sebagai `ApiError`; `LoginPage` menampilkan `err.message` atau `Login gagal`. |
| Register | `src/services/api/auth.ts` | POST | `/auth/register` | `{ email, password, full_name }` | `RegisterResponse` berisi `user`, `verification_ttl_seconds`, `resend_cooldown_seconds`, tanpa token | `auth:false`; `RegisterPage` meneruskan cooldown ke `/registration-success`, menampilkan pesan cek email, dan tidak menyimpan session sampai email diverifikasi. Backend membuat token lalu mengirim email verifikasi di background via Resend API atau SMTP; jika backend menerima retry register untuk akun belum verified dengan password yang sama, halaman mengikuti response sukses ini sebagai recovery email verifikasi. |
| Google login | `src/services/api/auth.ts` | POST | `/auth/google` | `{ id_token }` | `AuthResponse` dengan `user.has_google` | `GoogleLoginButton` mengambil credential dari Google Identity Services; `AuthContext.googleLogin` menyimpan session seperti login biasa. |
| Verify email | `src/services/api/auth.ts` | POST | `/auth/email/verify` | `{ token }` | `null` | `VerifyEmailPage` membaca token dari query `/verify-email?email=...&token=...`, deduplicate request per token, retry sekali untuk `404` sesaat, lalu menampilkan sukses/gagal; saat gagal user bisa resend dari halaman yang sama dengan countdown cooldown. |
| Resend email verification | `src/services/api/auth.ts` | POST | `/auth/email/verification/resend` | `{ email }` | Success: `EmailVerificationPolicy` berisi `verification_ttl_seconds` dan `resend_cooldown_seconds`; `429` error detail berisi `retry_after_seconds` | `LoginPage`, `RegistrationSuccessPage`, dan `VerifyEmailPage` menampilkan pesan netral anti-enumeration; halaman success/verify memakai `resend_cooldown_seconds` untuk countdown, lalu memakai `retry_after_seconds` jika backend mengembalikan `429`. |
| Refresh token | `src/services/api/auth.ts` | POST | `/auth/refresh` | `{ refresh_token }` | `AuthResponse` | `auth:false`; pending refresh dideduplikasi dengan `pendingRefresh`; bootstrap hanya refresh jika access token expired/akan expired; refresh gagal selain timeout menghapus session. |
| Me | `src/services/api/auth.ts` | GET | `/me` | Tidak ada | `User` | Protected request; 401 menghapus session lokal via API client. |
| Update profile | `src/services/api/auth.ts` | PATCH | `/me` | `{ full_name }` | `User` | Protected request; `SettingsPage` memperbarui nama profile dan `AuthContext.updateProfile` menyimpan user terbaru ke localStorage. |
| Link Google account | `src/services/api/auth.ts` | POST | `/me/google/link` | `{ id_token }` | `User` | Protected request; `SettingsPage` memakai `GoogleLoginButton` sebagai tombol tautkan Google, email Google harus sama dengan email akun aktif; mismatch `422` tampil sebagai error tanpa logout, lalu sukses `AuthContext.linkGoogleAccount` menyimpan user terbaru. |
| Unlink Google account | `src/services/api/auth.ts` | DELETE | `/me/google/link` | Tidak ada | `User` | Protected request; `SettingsPage` menampilkan konfirmasi sebelum melepas tautan Google dan backend menolak akun Google-only sampai password manual dibuat. Sukses `AuthContext.unlinkGoogleAccount` menyimpan user terbaru. |
| Setup password | `src/services/api/auth.ts` | POST | `/me/password/setup` | `{ new_password, confirm_password }` | `null` | Protected request; `SettingsPage` memakai ini ketika `user.has_password === false`, lalu refresh profile lokal; metode login memakai kombinasi `has_password` dan `has_google`. |
| Ubah password | `src/services/api/auth.ts` | PATCH | `/me/password` | `{ current_password, new_password, confirm_password }` | `null` | Protected request; `SettingsPage` validasi lokal required/min 8/konfirmasi sama dan memakai `getFriendlyApiError`. |
| Logout | `src/services/api/auth.ts` | POST | `/auth/logout` | `{ refresh_token }` | `null` | `auth:false`; `AuthContext.logout` menghapus session lokal dulu dan mengabaikan error logout API. |

## Business dan Inventory User

| Fitur | File Service | Method | Endpoint | Request | Response | Penanganan Error |
| --- | --- | --- | --- | --- | --- | --- |
| Ambil business limit | `src/services/api/businesses.ts` | GET | `/settings/business-limit` | Tidak ada | `BusinessLimitSetting` | Protected request; error halaman ditampilkan di `BusinessesPage`. |
| List businesses | `src/services/api/businesses.ts` | GET | `/businesses?limit={limit}&offset={offset}` | Query `limit`, `offset` | `ListResponse<Business>` | Protected request; error ditampilkan sebagai `Gagal memuat toko` atau message API. |
| Create business | `src/services/api/businesses.ts` | POST | `/businesses` | `{ name, industry?, description? }` | `Business` | `BusinessesPage` memakai `getFriendlyApiError(err, "Gagal membuat toko")`. |
| Detail business | `src/services/api/businesses.ts` | GET | `/businesses/{publicId}` | Path `publicId` | `Business` | Protected request; halaman dashboard/score/subscore/detail inventory menampilkan message error/fallback. |
| Create business inventory | `src/services/api/businesses.ts` | POST | `/businesses/{publicId}/inventory-submissions` | `InventoryPayload` | `InventorySubmission` dengan `analysis.action_plan` 30 hari | `InventoryPage` memakai `getFriendlyApiError(err, "Gagal menyimpan inventarisasi")`. |
| List business inventories | `src/services/api/businesses.ts` | GET | `/businesses/{publicId}/inventory-submissions?limit={limit}&offset={offset}` | Query `limit`, `offset` | `ListResponse<InventorySubmission>` | Protected request; tidak ditemukan pemakaian di halaman saat ini. |
| Latest business inventory | `src/services/api/businesses.ts` | GET | `/businesses/{publicId}/inventory-submissions/latest` | Path `publicId` | `InventorySubmission` dengan `analysis.action_plan` 30 hari dan `analysis.metrics` | Dipakai dashboard/score/subscore/detail inventory user; subscore memakai data inventory dan metrics untuk insight operasional; beberapa halaman menangkap error untuk fallback `null` atau status belum ada data; 401 tetap menghapus session. |

## Admin

| Fitur | File Service | Method | Endpoint | Request | Response | Penanganan Error |
| --- | --- | --- | --- | --- | --- | --- |
| Admin summary | `src/services/api/admin.ts` | GET | `/admin/dashboard/summary` | Tidak ada | `AdminSummary` | `AdminPage` menampilkan `Gagal memuat dashboard admin` atau message error. |
| Audit logs | `src/services/api/admin.ts` | GET | `/admin/audit-logs?limit={limit}&offset={offset}&level={level}&search={search}` | Query `limit`, `offset`, optional `level`, optional `search` | `ListResponse<AuditLog>` | Search/filter diproses server-side agar pagination mengikuti hasil filter; `AdminPage` mengosongkan list/meta dan menampilkan `Gagal memuat audit log` atau message error. |
| Admin business limit | `src/services/api/admin.ts` | GET | `/admin/settings/business-limit` | Tidak ada | `BusinessLimitSetting` | Error digabung dalam loading admin utama. |
| Update business limit | `src/services/api/admin.ts` | PATCH | `/admin/settings/business-limit` | `{ value }` | `BusinessLimitSetting` | `AdminPage` menampilkan setting message sukses/gagal. |
| Admin users | `src/services/api/admin.ts` | GET | `/admin/users?limit={limit}&offset={offset}` | Query `limit`, `offset` | `ListResponse<User>` | Backend mengurutkan user biasa terbaru lebih dulu dan akun admin paling akhir; error digabung dalam loading admin utama atau detail inventory admin. |
| Update user status | `src/services/api/admin.ts` | PATCH | `/admin/users/{id}/status` | `{ status }` | `User` | `AdminPage.updateStatus` tidak membungkus try/catch lokal; error akan reject dari event handler. |
| Admin businesses | `src/services/api/admin.ts` | GET | `/admin/businesses?limit={limit}&offset={offset}` | Query `limit`, `offset` | `ListResponse<Business>` | Error digabung dalam loading admin utama. |
| Admin business detail | `src/services/api/admin.ts` | GET | `/admin/businesses/{publicId}` | Path `publicId` | `Business` | Halaman score/dashboard/subscore/detail inventory menampilkan message error/fallback. |
| Diagnosis watchlist | `src/services/api/admin.ts` | GET | `/admin/diagnosis-watchlist?limit={limit}&offset={offset}` | Query `limit`, `offset` | `ListResponse<InventorySubmission>` | `AdminPage` mengosongkan list/meta dan menampilkan `Gagal memuat monitoring diagnosis` atau message error. |
| Latest admin business inventory | `src/services/api/admin.ts` | GET | `/admin/businesses/{publicId}/inventory-submissions/latest` | Path `publicId` | `InventorySubmission` dengan `analysis.action_plan` 30 hari dan `analysis.metrics` | Halaman admin/user shared menampilkan message error/fallback; subscore admin memakai data inventory dan metrics untuk insight operasional; `DashboardShell` menangkap error untuk disable nav. |
| Admin inventory submissions | `src/services/api/admin.ts` | GET | `/admin/inventory-submissions?limit={limit}&offset={offset}` | Query `limit`, `offset` | `ListResponse<InventorySubmission>` | Service tersedia; tidak ditemukan pemakaian halaman saat ini. |

## Admin Notifications

| Fitur | File Service | Method | Endpoint | Request | Response | Penanganan Error |
| --- | --- | --- | --- | --- | --- | --- |
| List notifications | `src/services/api/notifications.ts` | GET | `/admin/notifications?limit={limit}&offset={offset}` | Query `limit`, `offset` | `ListResponse<AdminNotification>` | `DashboardShell` mengosongkan state notifikasi jika gagal memuat. |
| Unread count | `src/services/api/notifications.ts` | GET | `/admin/notifications/unread-count` | Tidak ada | `{ count: number }` | `DashboardShell` fallback ke `0` jika gagal. |
| Mark notification read | `src/services/api/notifications.ts` | PATCH | `/admin/notifications/{id}/read` | Tidak ada | `null` | UI melakukan optimistic update dan mengabaikan error agar dropdown tetap responsif. |
| Mark all notifications read | `src/services/api/notifications.ts` | PATCH | `/admin/notifications/read-all` | Tidak ada | `null` | UI melakukan optimistic update dan mengabaikan error agar dropdown tetap responsif. |
| Notification WebSocket | `src/services/api/notifications.ts` | WS | `/admin/notifications/ws?access_token={token}` | Access token di query string | `NotificationEvent` | `DashboardShell` reconnect setiap 3 detik jika koneksi tertutup saat admin masih login. |

## API Client Behavior

| Fitur | File Service | Method | Endpoint | Request | Response | Penanganan Error |
| --- | --- | --- | --- | --- | --- | --- |
| Generic request | `src/services/api/client.ts` | Semua | `${baseUrl}${path}` | `RequestInit`, optional `auth:false` | `envelope.data as T` | Non-OK atau `success:false` menjadi `ApiError(status, message, error)`. Protected request dengan `401` mencoba refresh token dan retry request sekali. Request `GET`/`HEAD` yang timeout dicoba ulang otomatis sekali setelah 2 detik. |
| Auth header | `src/services/api/client.ts` | Semua protected | Semua path dengan `auth !== false` | Access token dari configured provider | Header `Authorization: Bearer <token>` | Jika token kosong, request tetap dikirim tanpa header. |
| Timeout | `src/services/api/client.ts` | Semua | Semua | `AbortSignal.timeout(15000)` | Tidak ada | DOMException `TimeoutError` pada request `GET`/`HEAD` dicoba ulang otomatis sekali; jika tetap gagal menjadi `ApiTimeoutError` dan memicu timeout notice global. |
| Unauthorized hook | `src/services/api/client.ts` | Protected | Semua protected | Response status 401 setelah retry refresh gagal | Tidak ada | Memanggil `onUnauthorized`, yang di `AuthContext` menghapus `gimb:auth`. |
