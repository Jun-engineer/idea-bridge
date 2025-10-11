import { randomUUID } from "crypto";
import { config } from "../config";
import { generateNumericCode } from "../utils/otp";

export type VerificationMethod = "email" | "phone";

export interface VerificationRequest {
  id: string;
  userId: string;
  method: VerificationMethod;
  code: string;
  destination: string;
  maskedDestination: string;
  expiresAt: string;
  resendAvailableAt: string;
  attemptsRemaining: number;
  createdAt: string;
  updatedAt: string;
}

const requestsById = new Map<string, VerificationRequest>();
const requestsByUser = new Map<string, Map<VerificationMethod, string>>();

function now() {
  return new Date();
}

function configuredCodeLength() {
  return Math.max(1, Math.min(10, Math.floor(config.verificationCodeLength)));
}

function configuredAttemptLimit() {
  return Math.max(1, Math.floor(config.verificationMaxAttempts));
}

export function toChallengePayload(request: VerificationRequest) {
  return {
    requestId: request.id,
    method: request.method,
    maskedDestination: request.maskedDestination,
    expiresAt: request.expiresAt,
    resendAvailableAt: request.resendAvailableAt,
    attemptsRemaining: request.attemptsRemaining,
  };
}

export function getRequest(requestId: string): VerificationRequest | null {
  const request = requestsById.get(requestId);
  if (!request) return null;
  if (new Date(request.expiresAt).getTime() <= Date.now()) {
    deleteRequest(request.id);
    return null;
  }
  return request;
}

function deleteRequest(requestId: string) {
  const existing = requestsById.get(requestId);
  if (!existing) return;
  requestsById.delete(requestId);
  const userRequests = requestsByUser.get(existing.userId);
  if (!userRequests) return;
  userRequests.delete(existing.method);
  if (userRequests.size === 0) {
    requestsByUser.delete(existing.userId);
  }
}

export function createVerificationRequest(params: {
  userId: string;
  method: VerificationMethod;
  destination: string;
  maskedDestination: string;
}): VerificationRequest {
  const { userId, method, destination, maskedDestination } = params;
  const existing = requestsByUser.get(userId)?.get(method);
  if (existing) {
    deleteRequest(existing);
  }

  const createdAt = now();
  const expiresAt = new Date(createdAt.getTime() + config.verificationCodeTtlSeconds * 1000);
  const resendAvailableAt = new Date(
    createdAt.getTime() + config.verificationResendCooldownSeconds * 1000,
  );

  const request: VerificationRequest = {
    id: randomUUID(),
    userId,
    method,
    code: generateNumericCode(configuredCodeLength()),
    destination,
    maskedDestination,
    expiresAt: expiresAt.toISOString(),
    resendAvailableAt: resendAvailableAt.toISOString(),
    attemptsRemaining: configuredAttemptLimit(),
    createdAt: createdAt.toISOString(),
    updatedAt: createdAt.toISOString(),
  };

  requestsById.set(request.id, request);
  if (!requestsByUser.has(userId)) {
    requestsByUser.set(userId, new Map());
  }
  requestsByUser.get(userId)!.set(method, request.id);

  return request;
}

export function regenerateVerificationRequest(requestId: string): VerificationRequest | null {
  const request = getRequest(requestId);
  if (!request) return null;

  const updatedAt = now();
  const expiresAt = new Date(updatedAt.getTime() + config.verificationCodeTtlSeconds * 1000);
  const resendAvailableAt = new Date(
    updatedAt.getTime() + config.verificationResendCooldownSeconds * 1000,
  );

  const refreshed: VerificationRequest = {
    ...request,
    code: generateNumericCode(configuredCodeLength()),
    expiresAt: expiresAt.toISOString(),
    resendAvailableAt: resendAvailableAt.toISOString(),
    attemptsRemaining: configuredAttemptLimit(),
    updatedAt: updatedAt.toISOString(),
  };

  requestsById.set(requestId, refreshed);
  requestsByUser.get(request.userId)?.set(request.method, requestId);

  return refreshed;
}

export function consumeVerificationCode(requestId: string, code: string): {
  success: boolean;
  request?: VerificationRequest;
  reason?: "expired" | "invalid" | "attempts-exhausted";
} {
  const request = requestsById.get(requestId);
  if (!request) {
    return { success: false, reason: "expired" };
  }

  if (new Date(request.expiresAt).getTime() <= Date.now()) {
    deleteRequest(requestId);
    return { success: false, reason: "expired" };
  }

  if (request.code !== code) {
    const attemptsRemaining = request.attemptsRemaining - 1;
    if (attemptsRemaining <= 0) {
      deleteRequest(requestId);
      return { success: false, reason: "attempts-exhausted" };
    }
    const updated: VerificationRequest = {
      ...request,
      attemptsRemaining,
      updatedAt: now().toISOString(),
    };
    requestsById.set(requestId, updated);
    return { success: false, reason: "invalid", request: updated };
  }

  deleteRequest(requestId);
  return { success: true, request };
}

export function clearVerificationForUser(userId: string, method: VerificationMethod) {
  const existing = requestsByUser.get(userId)?.get(method);
  if (existing) {
    deleteRequest(existing);
  }
}

export function resetVerificationStore() {
  requestsById.clear();
  requestsByUser.clear();
}
