import { apiRequest } from "./client";
import type { AdminSummary, AuditLog, Business, BusinessLimitSetting, InventorySubmission, ListResponse, User, UserStatus } from "./types";

export function adminSummary() {
  return apiRequest<AdminSummary>("/admin/dashboard/summary");
}

export function adminAuditLogs(params = { limit: 50, offset: 0 }) {
  return apiRequest<ListResponse<AuditLog>>(`/admin/audit-logs?limit=${params.limit}&offset=${params.offset}`);
}

export function adminBusinessLimit() {
  return apiRequest<BusinessLimitSetting>("/admin/settings/business-limit");
}

export function updateBusinessLimit(value: number) {
  return apiRequest<BusinessLimitSetting>("/admin/settings/business-limit", {
    method: "PATCH",
    body: JSON.stringify({ value }),
  });
}

export function adminUsers(params = { limit: 20, offset: 0 }) {
  return apiRequest<ListResponse<User>>(`/admin/users?limit=${params.limit}&offset=${params.offset}`);
}

export function updateUserStatus(id: string, status: UserStatus) {
  return apiRequest<User>(`/admin/users/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function adminBusinesses(params = { limit: 20, offset: 0 }) {
  return apiRequest<ListResponse<Business>>(`/admin/businesses?limit=${params.limit}&offset=${params.offset}`);
}

export function adminBusiness(publicId: string) {
  return apiRequest<Business>(`/admin/businesses/${publicId}`);
}

export function adminDiagnosisWatchlist(params = { limit: 5, offset: 0 }) {
  return apiRequest<ListResponse<InventorySubmission>>(`/admin/diagnosis-watchlist?limit=${params.limit}&offset=${params.offset}`);
}

export function adminLatestBusinessInventory(publicId: string) {
  return apiRequest<InventorySubmission>(`/admin/businesses/${publicId}/inventory-submissions/latest`);
}

export function adminInventorySubmissions(params = { limit: 20, offset: 0 }) {
  return apiRequest<ListResponse<InventorySubmission>>(`/admin/inventory-submissions?limit=${params.limit}&offset=${params.offset}`);
}
