import { Router, type Response } from "express";
import argon2 from "argon2";
import { z } from "zod";
import { config } from "../config";
import {
  createSession,
  createUser,
  destroyAllSessionsForUser,
  destroySession,
  getUserByEmail,
  getUserById,
  softDeleteUser,
  updateUser,
} from "../data/userStore";
import type { User } from "../types";
import { requireAuth } from "../middleware/auth";
import { signAccessToken } from "../utils/jwt";
import { maskPhone } from "../utils/masking";
import { sanitizePhoneNumberInput } from "../utils/phone";
import {
  clearVerificationForUser,
  consumeVerificationCode,
  createVerificationRequest,
  getRequest,
  regenerateVerificationRequest,
  toChallengePayload,
} from "../data/verificationStore";
import { sendSmsVerification } from "../services/notification";

const router = Router();
const roleChangeCooldownMs = config.roleChangeCooldownSeconds * 1000;

const roleEnum = z.enum(["idea-creator", "developer"]);
const phoneNumberRegex = /^[+0-9()\s-]{7,20}$/;

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(2).max(80),
  bio: z.string().max(500).optional(),
  preferredRole: roleEnum,
  phoneNumber: z
    .string()
    .trim()
    .regex(phoneNumberRegex, "Enter a valid phone number"),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const updateSchema = z.object({
  displayName: z.string().min(2).max(80).optional(),
  bio: z.union([z.string().max(500), z.null()]).optional(),
  preferredRole: roleEnum.nullable().optional(),
  confirmRoleChange: z.boolean().optional(),
  phoneNumber: z
    .union([z.string().trim().regex(phoneNumberRegex, "Enter a valid phone number"), z.null()])
    .optional(),
});

const verificationLookupSchema = z.object({
  requestId: z.string().uuid(),
});

const verificationConfirmSchema = z.object({
  requestId: z.string().uuid(),
  code: z
    .string()
    .trim()
    .regex(/^[0-9]{4,10}$/u, "Enter the verification code"),
});

const verificationStartSchema = z.object({
  phoneNumber: z
    .string()
    .trim()
    .regex(phoneNumberRegex, "Enter a valid phone number")
    .optional(),
});

function sanitizeUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    bio: user.bio ?? null,
    preferredRole: user.preferredRole ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    roleChangeEligibleAt: user.roleChangeEligibleAt,
    phoneNumber: user.phoneNumber ?? null,
    phoneVerified: user.phoneVerified,
    pendingVerificationMethod: user.pendingVerificationMethod,
  };
}

function setSessionCookie(res: Response, token: string) {
  res.cookie(config.sessionCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: config.sessionCookieSecure,
    maxAge: config.accessTokenTtlSeconds * 1000,
    path: "/",
  });
}

function clearSessionCookie(res: Response) {
  res.clearCookie(config.sessionCookieName, {
    httpOnly: true,
    sameSite: "lax",
    secure: config.sessionCookieSecure,
    path: "/",
  });
}

async function buildAuthenticatedResponse(res: Response, user: User) {
  const session = await createSession(user.id);
  const token = signAccessToken(user.id, session.id);
  setSessionCookie(res, token);
  return {
    status: "authenticated" as const,
    user: sanitizeUser(user),
    token,
  };
}

async function issuePhoneVerification(user: User) {
  const destination = user.phoneNumber;
  if (!destination) {
    throw new Error("No phone number available for verification");
  }
  const masked = maskPhone(destination);
  const request = await createVerificationRequest({
    userId: user.id,
    method: "phone",
    destination,
    maskedDestination: masked,
  });

  await sendSmsVerification(destination, request.code);

  return toChallengePayload(request);
}

router.post("/register", async (req, res) => {
  const parseResult = registerSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ errors: parseResult.error.flatten() });
  }

  const { email, password, displayName, bio, preferredRole, phoneNumber } = parseResult.data;
  let normalizedPhone: string;
  try {
    normalizedPhone = sanitizePhoneNumberInput(phoneNumber, { requireCountryCode: true }) ?? "";
  } catch (err) {
    const message = err instanceof Error ? err.message : "Enter a valid phone number including country code.";
    return res.status(400).json({ message });
  }

  if (!normalizedPhone) {
    return res.status(400).json({ message: "Phone number is required." });
  }
  const existing = await getUserByEmail(email);
  if (existing && !existing.deletedAt) {
    return res.status(409).json({ message: "An account with that email already exists" });
  }

  const passwordHash = await argon2.hash(password);
  const roleChangeEligibleAt = new Date(Date.now() + roleChangeCooldownMs).toISOString();

  const user = await createUser({
    email,
    passwordHash,
    displayName,
    bio,
    preferredRole,
    roleChangeEligibleAt,
    phoneNumber: normalizedPhone,
    phoneVerified: !config.phoneVerificationEnabled,
    pendingVerificationMethod: config.phoneVerificationEnabled ? "phone" : null,
  });

  if (!config.phoneVerificationEnabled) {
    const responseBody = await buildAuthenticatedResponse(res, user);
    return res.status(201).json(responseBody);
  }

  try {
    const challenge = await issuePhoneVerification(user);
    return res.status(201).json({
      status: "verification_required",
      verification: challenge,
    });
  } catch (err) {
    console.error("Failed to dispatch verification challenge", err);
    return res.status(500).json({ message: "Failed to initiate verification" });
  }
});

router.post("/login", async (req, res) => {
  const parseResult = loginSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ errors: parseResult.error.flatten() });
  }

  const { email, password } = parseResult.data;
  const user = await getUserByEmail(email);
  if (!user || user.deletedAt) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const passwordValid = await argon2.verify(user.passwordHash, password);
  if (!passwordValid) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  if (config.phoneVerificationEnabled && user.pendingVerificationMethod === "phone") {
    try {
      const challenge = await issuePhoneVerification(user);
      return res.json({ status: "verification_required", verification: challenge });
    } catch (err) {
      console.error("Failed to dispatch verification challenge", err);
      return res.status(500).json({ message: "Failed to initiate verification" });
    }
  }

  const responseBody = await buildAuthenticatedResponse(res, user);
  return res.json(responseBody);
});

router.post("/logout", requireAuth, async (req, res) => {
  if (req.authSession) {
    await destroySession(req.authSession.id);
  }
  clearSessionCookie(res);
  return res.json({ success: true });
});

router.get("/me", (req, res) => {
  if (!req.authUser) {
    return res.status(200).json({ user: null });
  }
  return res.json({ user: sanitizeUser(req.authUser) });
});

router.get("/verification/:requestId", async (req, res) => {
  const parseResult = verificationLookupSchema.safeParse({ requestId: req.params.requestId });
  if (!parseResult.success) {
    return res.status(400).json({ errors: parseResult.error.flatten() });
  }

  const request = await getRequest(parseResult.data.requestId);
  if (!request) {
    return res.status(404).json({ message: "Verification request not found" });
  }

  return res.json({ verification: toChallengePayload(request) });
});

router.post("/verification/request", async (req, res) => {
  const parseResult = verificationLookupSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ errors: parseResult.error.flatten() });
  }

  const { requestId } = parseResult.data;
  const request = await getRequest(requestId);
  if (!request) {
    return res.status(404).json({ message: "Verification request not found" });
  }

  const retryAtMs = new Date(request.resendAvailableAt).getTime();
  const nowMs = Date.now();
  if (retryAtMs > nowMs) {
    return res.status(429).json({
      message: "Please wait before requesting a new code",
      retryAfterSeconds: Math.ceil((retryAtMs - nowMs) / 1000),
      verification: toChallengePayload(request),
    });
  }

  const refreshed = await regenerateVerificationRequest(requestId);
  if (!refreshed) {
    return res.status(404).json({ message: "Verification request not found" });
  }

  const user = await getUserById(refreshed.userId);
  if (!user || user.deletedAt) {
    await clearVerificationForUser(refreshed.userId, refreshed.method);
    return res.status(404).json({ message: "Verification request not found" });
  }

  try {
    await sendSmsVerification(refreshed.destination, refreshed.code);
  } catch (err) {
    console.error("Failed to resend verification challenge", err);
    return res.status(500).json({ message: "Failed to resend verification" });
  }

  return res.json({ verification: toChallengePayload(refreshed) });
});

router.post("/verification/start", requireAuth, async (req, res) => {
  if (!config.phoneVerificationEnabled) {
    return res.status(400).json({ message: "Phone verification is currently disabled" });
  }
  const parseResult = verificationStartSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ errors: parseResult.error.flatten() });
  }

  const phoneNumberInput = parseResult.data.phoneNumber;
  const currentUser = req.authUser!;

  let phoneNumber: string | null;
  try {
    phoneNumber = sanitizePhoneNumberInput(
      phoneNumberInput ?? currentUser.phoneNumber,
      { requireCountryCode: true },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Enter a valid phone number including country code.";
    return res.status(400).json({ message });
  }

  if (!phoneNumber) {
    return res.status(400).json({ message: "Phone number is required for SMS verification" });
  }

  const patch: Parameters<typeof updateUser>[1] = {
    pendingVerificationMethod: "phone",
    phoneNumber,
    phoneVerified: false,
  };

  const updatedUser = await updateUser(currentUser.id, patch);
  if (!updatedUser) {
    return res.status(404).json({ message: "User not found" });
  }

  req.authUser = updatedUser;

  try {
    const challenge = await issuePhoneVerification(updatedUser);
    return res.json({ status: "verification_required", verification: challenge });
  } catch (err) {
    console.error("Failed to start verification challenge", err);
    return res.status(500).json({ message: "Failed to start verification" });
  }
});

router.post("/verification/confirm", async (req, res) => {
  const parseResult = verificationConfirmSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ errors: parseResult.error.flatten() });
  }

  const { requestId, code } = parseResult.data;
  const result = await consumeVerificationCode(requestId, code);

  if (!result.success) {
    if (result.reason === "expired") {
      return res.status(410).json({ message: "Verification code expired" });
    }
    if (result.reason === "attempts-exhausted") {
      return res.status(429).json({
        message: "Too many incorrect attempts. Request a new code.",
      });
    }
    return res.status(400).json({
      message: "Incorrect verification code",
      verification: result.request ? toChallengePayload(result.request) : undefined,
    });
  }

  const request = result.request!;
  const user = await getUserById(request.userId);
  if (!user || user.deletedAt) {
    return res.status(404).json({ message: "User not found" });
  }

  const patch: Parameters<typeof updateUser>[1] = {
    pendingVerificationMethod:
      user.pendingVerificationMethod === request.method ? null : undefined,
    phoneVerified: true,
  };

  const updatedUser = await updateUser(user.id, patch);
  if (!updatedUser) {
    return res.status(404).json({ message: "User not found" });
  }

  await clearVerificationForUser(updatedUser.id, request.method);

  const responseBody = await buildAuthenticatedResponse(res, updatedUser);
  return res.json(responseBody);
});

router.put("/me", requireAuth, async (req, res) => {
  const parseResult = updateSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ errors: parseResult.error.flatten() });
  }

  const updates = parseResult.data;
  const currentUser = req.authUser!;
  const patch: Parameters<typeof updateUser>[1] = {};

  const previousPhone = currentUser.phoneNumber ?? null;
  let normalizedPhone: string | null | undefined;
  if (updates.phoneNumber === undefined) {
    normalizedPhone = undefined;
  } else if (updates.phoneNumber === null) {
    normalizedPhone = null;
  } else {
    try {
      normalizedPhone = sanitizePhoneNumberInput(updates.phoneNumber, { requireCountryCode: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Enter a valid phone number including country code.";
      return res.status(400).json({ message });
    }
  }
  const phoneChanged =
    normalizedPhone !== undefined && normalizedPhone !== previousPhone;

  if (updates.displayName !== undefined) {
    patch.displayName = updates.displayName;
  }

  if (updates.bio !== undefined) {
    patch.bio = updates.bio;
  }

  if (updates.preferredRole !== undefined) {
    const desiredRole = updates.preferredRole;
    const currentRole = currentUser.preferredRole ?? null;
    const nextRole = desiredRole ?? null;
    const roleChanged = nextRole !== currentRole;

    if (roleChanged) {
      if (!updates.confirmRoleChange) {
        return res.status(400).json({ message: "Confirm role change to proceed" });
      }
      const eligibleAt = new Date(currentUser.roleChangeEligibleAt).getTime();
      const now = Date.now();
      if (eligibleAt > now) {
        return res.status(429).json({
          message: "Role change cooldown active",
          retryAfterSeconds: Math.ceil((eligibleAt - now) / 1000),
          roleChangeEligibleAt: currentUser.roleChangeEligibleAt,
        });
      }
      patch.preferredRole = desiredRole;
      patch.roleChangeEligibleAt = new Date(now + roleChangeCooldownMs).toISOString();
    } else {
      patch.preferredRole = desiredRole;
    }
  }

  if (normalizedPhone !== undefined) {
    if (normalizedPhone === null) {
      if (previousPhone !== null) {
        patch.phoneNumber = null;
        patch.phoneVerified = false;
        patch.pendingVerificationMethod = null;
      }
    } else if (normalizedPhone.length === 0) {
      if (previousPhone !== null) {
        patch.phoneNumber = null;
        patch.phoneVerified = false;
        patch.pendingVerificationMethod = null;
      }
    } else if (phoneChanged) {
      patch.phoneNumber = normalizedPhone;
      patch.phoneVerified = false;
      patch.pendingVerificationMethod = config.phoneVerificationEnabled ? "phone" : null;
    }
  }

  const user = await updateUser(currentUser.id, patch);

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  req.authUser = user;

  if (config.phoneVerificationEnabled && phoneChanged && normalizedPhone) {
    try {
      const verification = await issuePhoneVerification(user);
      return res.json({ user: sanitizeUser(user), verification });
    } catch (err) {
      console.error("Failed to dispatch verification challenge", err);
      return res.status(500).json({ message: "Failed to initiate verification" });
    }
  }

  return res.json({ user: sanitizeUser(user) });
});

router.delete("/me", requireAuth, async (req: Express.Request, res: Response) => {
  const user = await softDeleteUser(req.authUser!.id);
  if (user) {
    await destroyAllSessionsForUser(user.id);
  }
  clearSessionCookie(res);
  return res.status(204).send();
});

export const authRouter = router;
