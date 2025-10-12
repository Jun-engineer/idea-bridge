export function normalizePhoneNumber(value: string): string {
  const digits = value.replace(/[^\d+]/g, "").replace(/^00/, "+");
  if (!digits.startsWith("+") && digits.length > 0) {
    return `+${digits}`;
  }
  return digits;
}

export function sanitizePhoneNumberInput(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  return normalizePhoneNumber(trimmed);
}
