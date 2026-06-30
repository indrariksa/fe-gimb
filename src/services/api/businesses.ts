import { apiRequest } from "./client";
import type { Business, BusinessLimitSetting, InventoryPayload, InventorySubmission, ListResponse } from "./types";

export function getBusinessLimit() {
  return apiRequest<BusinessLimitSetting>("/settings/business-limit");
}

export function listBusinesses(params = { limit: 20, offset: 0 }) {
  return apiRequest<ListResponse<Business>>(`/businesses?limit=${params.limit}&offset=${params.offset}`);
}

export function createBusiness(payload: { name: string; industry?: string; description?: string }) {
  return apiRequest<Business>("/businesses", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getBusiness(publicId: string) {
  return apiRequest<Business>(`/businesses/${publicId}`);
}

export function createBusinessInventory(publicId: string, payload: InventoryPayload) {
  return apiRequest<InventorySubmission>(`/businesses/${publicId}/inventory-submissions`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function listBusinessInventories(publicId: string, params = { limit: 20, offset: 0 }) {
  return apiRequest<ListResponse<InventorySubmission>>(
    `/businesses/${publicId}/inventory-submissions?limit=${params.limit}&offset=${params.offset}`,
  );
}

export function latestBusinessInventory(publicId: string) {
  return apiRequest<InventorySubmission>(`/businesses/${publicId}/inventory-submissions/latest`);
}
