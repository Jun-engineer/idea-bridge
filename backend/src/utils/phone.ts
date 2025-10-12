export function normalizePhoneNumber(value: string): string {
  const digits = value.replace(/[^\d+]/g, "").replace(/^00/, "+");
  return digits;
}

export function sanitizePhoneNumberInput(
  value: string | null | undefined,
  { requireCountryCode = true }: { requireCountryCode?: boolean } = {},
): string | null {
  if (value == null) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const normalized = normalizePhoneNumber(trimmed);
  if (!normalized) {
    return null;
  }

  if (requireCountryCode && !normalized.startsWith("+")) {
    throw new Error("Phone numbers must include a leading + and country code.");
  }

  return normalized;
}
