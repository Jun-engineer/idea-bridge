import { randomInt } from "crypto";

export function generateNumericCode(length = 6): string {
  if (length < 1 || length > 10) {
    throw new Error("OTP length must be between 1 and 10 digits");
  }
  const min = 10 ** (length - 1);
  const max = 10 ** length - 1;
  const value = randomInt(min, max + 1);
  return value.toString().padStart(length, "0");
}
