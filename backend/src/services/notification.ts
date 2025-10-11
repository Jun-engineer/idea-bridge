import { config } from "../config";

type VerificationMethod = "email" | "phone";

interface VerificationMessage {
  method: VerificationMethod;
  destination: string;
  code: string;
}

function log(message: VerificationMessage) {
  // In a real system, integrate with providers (SendGrid, Twilio, etc.)
  const channel = message.method === "email" ? "Email" : "SMS";
  const prefix = `[Verification:${channel}]`;
  if (config.verificationLoggingEnabled) {
    console.info(`${prefix} Sending code ${message.code} to ${message.destination}`);
  }
}

export async function sendEmailVerification(destination: string, code: string): Promise<void> {
  log({ method: "email", destination, code });
}

export async function sendSmsVerification(destination: string, code: string): Promise<void> {
  log({ method: "phone", destination, code });
}
