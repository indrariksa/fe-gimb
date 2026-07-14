# API Integration Map

Base URL berasal dari `VITE_API_BASE_URL`, fallback `http://127.0.0.1:8080/api/v1`. Semua request memakai `apiRequest<T>` dari `src/services/api/client.ts`.

## Auth

| Fitur | File Service | Method | Endpoint | Request | Response | Penanganan Error |
| --- | --- | --- | --- | --- | --- | --- |
| Login | `src/services/api/auth.ts` | POST | `/auth/login` | `{ email, password }` | `AuthResponse` | `auth:false`; error dilempar sebagai `ApiError`; `LoginPage` menampilkan `err.message` atau `Login gagal`. |
| Register | `src/services/api/auth.ts` | POST | `/auth/register` | `{ email, password, full_name }` | `AuthResponse` | `auth:false`; `RegisterPage` menampilkan `err.message` atau `Registrasi gagal`. |
| Refresh token | `src/services/api/auth.ts` | POST | `/auth/refresh` | `{ refresh_token }` | `AuthResponse` | `auth:false`; pending refresh dideduplikasi dengan `pendingRefresh`; bootstrap menghapus session jika gagal selain timeout. |
| Me | `src/services/api/auth.ts` | GET | `/me` | Tidak ada | `User` | Protected request; 401 menghapus session lokal via API client. |
| Logout | `src/services/api/auth.ts` | POST | `/auth/logout` | `{ refresh_token }` | `null` | `auth:false`; `AuthContext.logout` menghapus session lokal dulu dan mengabaikan error logout API. |

## Business dan Inventory User

| Fitur | File Service | Method | Endpoint | Request | Response | Penanganan Error |
| --- | --- | --- | --- | --- | --- | --- |
| Ambil business limit | `src/services/api/businesses.ts` | GET | `/settings/business-limit` | Tidak ada | `BusinessLimitSetting` | Protected request; error halaman ditampilkan di `BusinessesPage`. |
| List businesses | `src/services/api/businesses.ts` | GET | `/businesses?limit={limit}&offset={offset}` | Query `limit`, `offset` | `ListResponse<Business>` | Protected request; error ditampilkan sebagai `Gagal memuat toko` atau message API. |
| Create business | `src/services/api/businesses.ts` | POST | `/businesses` | `{ name, industry?, description? }` | `Business` | `BusinessesPage` memakai `getFriendlyApiError(err, "Gagal membuat toko")`. |
| Detail business | `src/services/api/businesses.ts` | GET | `/businesses/{publicId}` | Path `publicId` | `Business` | Protected request; halaman menampilkan message error/fallback. |
| Create business inventory | `src/services/api/businesses.ts` | POST | `/businesses/{publicId}/inventory-submissions` | `InventoryPayload` | `InventorySubmission` | `InventoryPage` memakai `getFriendlyApiError(err, "Gagal menyimpan inventarisasi")`. |
| List business inventories | `src/services/api/businesses.ts` | GET | `/businesses/{publicId}/inventory-submissions?limit={limit}&offset={offset}` | Query `limit`, `offset` | `ListResponse<InventorySubmission>` | Protected request; tidak ditemukan pemakaian di halaman saat ini. |
| Latest business inventory | `src/services/api/businesses.ts` | GET | `/businesses/{publicId}/inventory-submissions/latest` | Path `publicId` | `InventorySubmission` | Beberapa halaman menangkap error untuk fallback `null` atau status belum ada data; 401 tetap menghapus session. |

## Admin

| Fitur | File Service | Method | Endpoint | Request | Response | Penanganan Error |
| --- | --- | --- | --- | --- | --- | --- |
| Admin summary | `src/services/api/admin.ts` | GET | `/admin/dashboard/summary` | Tidak ada | `AdminSummary` | `AdminPage` menampilkan `Gagal memuat dashboard admin` atau message error. |
| Audit logs | `src/services/api/admin.ts` | GET | `/admin/audit-logs?limit={limit}&offset={offset}` | Query `limit`, `offset` | `ListResponse<AuditLog>` | `AdminPage` mengosongkan list/meta dan menampilkan `Gagal memuat audit log` atau message error. |
| Admin business limit | `src/services/api/admin.ts` | GET | `/admin/settings/business-limit` | Tidak ada | `BusinessLimitSetting` | Error digabung dalam loading admin utama. |
| Update business limit | `src/services/api/admin.ts` | PATCH | `/admin/settings/business-limit` | `{ value }` | `BusinessLimitSetting` | `AdminPage` menampilkan setting message sukses/gagal. |
| Admin users | `src/services/api/admin.ts` | GET | `/admin/users?limit={limit}&offset={offset}` | Query `limit`, `offset` | `ListResponse<User>` | Error digabung dalam loading admin utama atau detail inventory admin. |
| Update user status | `src/services/api/admin.ts` | PATCH | `/admin/users/{id}/status` | `{ status }` | `User` | `AdminPage.updateStatus` tidak membungkus try/catch lokal; error akan reject dari event handler. |
| Admin businesses | `src/services/api/admin.ts` | GET | `/admin/businesses?limit={limit}&offset={offset}` | Query `limit`, `offset` | `ListResponse<Business>` | Error digabung dalam loading admin utama. |
| Admin business detail | `src/services/api/admin.ts` | GET | `/admin/businesses/{publicId}` | Path `publicId` | `Business` | Halaman score/dashboard/subscore/detail inventory menampilkan message error/fallback. |
| Diagnosis watchlist | `src/services/api/admin.ts` | GET | `/admin/diagnosis-watchlist?limit={limit}&offset={offset}` | Query `limit`, `offset` | `ListResponse<InventorySubmission>` | `AdminPage` mengosongkan list/meta dan menampilkan `Gagal memuat monitoring diagnosis` atau message error. |
| Latest admin business inventory | `src/services/api/admin.ts` | GET | `/admin/businesses/{publicId}/inventory-submissions/latest` | Path `publicId` | `InventorySubmission` | Halaman admin/user shared menampilkan message error/fallback; `DashboardShell` menangkap error untuk disable nav. |
| Admin inventory submissions | `src/services/api/admin.ts` | GET | `/admin/inventory-submissions?limit={limit}&offset={offset}` | Query `limit`, `offset` | `ListResponse<InventorySubmission>` | Service tersedia; tidak ditemukan pemakaian halaman saat ini. |

## API Client Behavior

| Fitur | File Service | Method | Endpoint | Request | Response | Penanganan Error |
| --- | --- | --- | --- | --- | --- | --- |
| Generic request | `src/services/api/client.ts` | Semua | `${baseUrl}${path}` | `RequestInit`, optional `auth:false` | `envelope.data as T` | Non-OK atau `success:false` menjadi `ApiError(status, message, error)`. |
| Auth header | `src/services/api/client.ts` | Semua protected | Semua path dengan `auth !== false` | Access token dari configured provider | Header `Authorization: Bearer <token>` | Jika token kosong, request tetap dikirim tanpa header. |
| Timeout | `src/services/api/client.ts` | Semua | Semua | `AbortSignal.timeout(15000)` | Tidak ada | DOMException `TimeoutError` menjadi `ApiTimeoutError` dan memicu timeout notice global. |
| Unauthorized hook | `src/services/api/client.ts` | Protected | Semua protected | Response status 401 | Tidak ada | Memanggil `onUnauthorized`, yang di `AuthContext` menghapus `gimb:auth`. |
