import { apiRequest, storeAuthToken } from "./http";
import type { AuthResult, AuthUser, UserRole, VerificationChallenge } from "../types/models";

interface AuthResponseAuthenticated {
  status: "authenticated";
  user: AuthUser;
  token?: string | null;
}

interface AuthResponseVerification {
  status: "verification_required";
  verification: VerificationChallenge;
}

type AuthResponse = AuthResponseAuthenticated | AuthResponseVerification;

interface RegisterPayload {
  email: string;
  password: string;
  displayName: string;
  bio?: string;
  preferredRole: UserRole;
  phoneNumber: string;
}

interface LoginPayload {
  email: string;
  password: string;
}

interface UpdateProfilePayload {
  displayName?: string;
  bio?: string | null;
  preferredRole?: UserRole | null;
  confirmRoleChange?: boolean;
  phoneNumber?: string | null;
}

interface UpdateProfileResponse {
  user: AuthUser | null;
  verification?: VerificationChallenge;
}

export interface UpdateProfileResult {
  user: AuthUser;
  verification?: VerificationChallenge;
}

interface VerificationLookupPayload {
  requestId: string;
}

interface VerificationConfirmPayload extends VerificationLookupPayload {
  code: string;
}

interface VerificationStartPayload {
  phoneNumber?: string;
}

function mapAuthResponse(response: AuthResponse): AuthResult {
  if (response.status === "authenticated") {
    storeAuthToken(response.token ?? null);
    return {
      status: "authenticated",
      user: response.user,
      token: response.token ?? null,
    };
  }

  storeAuthToken(null);
  return {
    status: "verification_required",
    verification: response.verification,
  };
}

export async function registerUser(payload: RegisterPayload): Promise<AuthResult> {
  const response = await apiRequest<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return mapAuthResponse(response);
}

export async function loginUser(payload: LoginPayload): Promise<AuthResult> {
  const response = await apiRequest<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return mapAuthResponse(response);
}

export async function logoutUser(): Promise<void> {
  await apiRequest("/api/auth/logout", {
    method: "POST",
    skipJson: true,
  });
  storeAuthToken(null);
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  const response = await apiRequest<{ user: AuthUser | null }>("/api/auth/me", {
    method: "GET",
  });
  return response.user;
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<UpdateProfileResult> {
  const response = await apiRequest<UpdateProfileResponse>("/api/auth/me", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  if (!response.user) {
    throw new Error("Update failed");
  }
  return { user: response.user, verification: response.verification };
}

export async function deleteAccount(): Promise<void> {
  await apiRequest("/api/auth/me", {
    method: "DELETE",
    skipJson: true,
  });
}

export async function fetchVerification(requestId: string): Promise<VerificationChallenge> {
  const response = await apiRequest<{ verification: VerificationChallenge }>(
    `/api/auth/verification/${requestId}`,
    {
      method: "GET",
    },
  );
  return response.verification;
}

export async function resendVerificationCode(payload: VerificationLookupPayload): Promise<VerificationChallenge> {
  const response = await apiRequest<{ verification: VerificationChallenge }>(
    "/api/auth/verification/request",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
  return response.verification;
}

export async function confirmVerification(payload: VerificationConfirmPayload): Promise<AuthResult> {
  const response = await apiRequest<AuthResponse>("/api/auth/verification/confirm", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return mapAuthResponse(response);
}

export async function startVerification(payload: VerificationStartPayload = {}): Promise<AuthResult> {
  const response = await apiRequest<AuthResponse>("/api/auth/verification/start", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return mapAuthResponse(response);
}
