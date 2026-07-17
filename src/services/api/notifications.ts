import { apiRequest } from "./client";
import type { AdminNotification, ListResponse } from "./types";

export function adminNotifications(params = { limit: 10, offset: 0 }) {
  return apiRequest<ListResponse<AdminNotification>>(`/admin/notifications?limit=${params.limit}&offset=${params.offset}`);
}

export function unreadNotificationCount() {
  return apiRequest<{ count: number }>("/admin/notifications/unread-count");
}

export function markNotificationRead(id: string) {
  return apiRequest<null>(`/admin/notifications/${id}/read`, { method: "PATCH" });
}

export function markAllNotificationsRead() {
  return apiRequest<null>("/admin/notifications/read-all", { method: "PATCH" });
}

export function notificationWebSocketUrl(accessToken: string) {
  const base = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8080/api/v1";
  const url = new URL(`${base.replace(/\/$/, "")}/admin/notifications/ws`);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.searchParams.set("access_token", accessToken);
  return url.toString();
}
