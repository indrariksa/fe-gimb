export const JAKARTA_TIME_ZONE = "Asia/Jakarta";

type DateValue = string | number | Date | null | undefined;

function toValidDate(value: DateValue) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatJakartaDate(value: DateValue, month: "short" | "long" = "long", fallback = "-") {
  const date = toValidDate(value);
  if (!date) return fallback;
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: JAKARTA_TIME_ZONE,
    day: "numeric",
    month,
    year: "numeric",
  }).format(date);
}

export function formatJakartaDateTime(value: DateValue, fallback = "-") {
  const date = toValidDate(value);
  if (!date) return fallback;
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: JAKARTA_TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatJakartaTime(value: DateValue, fallback = "-") {
  const date = toValidDate(value);
  if (!date) return fallback;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: JAKARTA_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(date);
}

export function formatMonthYear(value: DateValue, fallback = "-") {
  const date = toValidDate(value);
  if (!date) return fallback;
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: JAKARTA_TIME_ZONE,
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatNotificationTime(value: DateValue, fallback = "-") {
  const date = toValidDate(value);
  if (!date) return fallback;

  const diffSeconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (diffSeconds < 60) return "Baru saja";
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)} menit lalu`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)} jam lalu`;

  return formatJakartaDateTime(date, fallback);
}
