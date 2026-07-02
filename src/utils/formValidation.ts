export function cleanText(value: string) {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function validateRequiredText(value: string, label: string, minLength = 2) {
  const cleaned = cleanText(value);
  if (!cleaned) return `${label} wajib diisi.`;
  if (cleaned.length < minLength) return `${label} minimal ${minLength} karakter.`;
  return "";
}

export function validateMaxLength(value: string, label: string, maxLength: number) {
  if (cleanText(value).length > maxLength) return `${label} maksimal ${maxLength} karakter.`;
  return "";
}

export function firstValidationError(errors: string[]) {
  return errors.find(Boolean) ?? "";
}
