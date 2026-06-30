import { apiRequest } from "./client";
import type { AdminSummary, Business, InventorySubmission, ListResponse, User, UserStatus } from "./types";

export function adminSummary() {
  return apiRequest<AdminSummary>("/admin/dashboard/summary");
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

export function adminInventorySubmissions(params = { limit: 20, offset: 0 }) {
  return apiRequest<ListResponse<InventorySubmission>>(`/admin/inventory-submissions?limit=${params.limit}&offset=${params.offset}`);
}
