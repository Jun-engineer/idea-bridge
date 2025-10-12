const ZERO_TRUNK_COUNTRY_CODES = ["61", "44", "82"];

export function normalizePhoneNumber(value: string): string {
  let digits = value.replace(/[^\d+]/g, "").replace(/^00/, "+");

  ZERO_TRUNK_COUNTRY_CODES.forEach((code) => {
    const prefix = `+${code}`;
    if (digits.startsWith(prefix)) {
      const remainder = digits.slice(prefix.length);
      if (remainder.startsWith("0") && remainder.length > 1) {
        digits = `${prefix}${remainder.slice(1)}`;
      }
    }
  });

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
