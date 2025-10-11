export function maskEmail(email: string): string {
  const [localPart, domain] = email.split("@");
  if (!domain) {
    return "***";
  }
  const maskedLocal = localPart.length <= 2
    ? `${localPart[0] ?? "*"}***`
    : `${localPart[0]}***${localPart[localPart.length - 1]}`;
  const domainParts = domain.split(".");
  const maskedDomain = domainParts
    .map((part, index) => (index === domainParts.length - 1 ? part : `${part[0]}***`))
    .join(".");
  return `${maskedLocal}@${maskedDomain}`;
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length <= 4) {
    return `***${digits}`;
  }
  const lastFour = digits.slice(-4);
  return `***-***-${lastFour}`;
}
