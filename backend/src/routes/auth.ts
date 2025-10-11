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
import { maskEmail, maskPhone } from "../utils/masking";
import {
  clearVerificationForUser,
  consumeVerificationCode,
  createVerificationRequest,
  getRequest,
  regenerateVerificationRequest,
  toChallengePayload,
  type VerificationMethod,
} from "../data/verificationStore";
import { sendEmailVerification, sendSmsVerification } from "../services/notification";

const router = Router();
const roleChangeCooldownMs = config.roleChangeCooldownSeconds * 1000;

const roleEnum = z.enum(["idea-creator", "developer"]);
const verificationMethodEnum = z.enum(["email", "phone"]);
const phoneNumberRegex = /^[+0-9()\s-]{7,20}$/;

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(2).max(80),
  bio: z.string().max(500).optional(),
  preferredRole: roleEnum,
  verificationMethod: verificationMethodEnum,
  phoneNumber: z
    .string()
    .trim()
    .regex(phoneNumberRegex, "Enter a valid phone number")
    .optional(),
}).superRefine((data, ctx) => {
  if (data.verificationMethod === "phone" && !data.phoneNumber) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["phoneNumber"],
      message: "Phone number is required for SMS verification",
    });
  }
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
  method: verificationMethodEnum,
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
    emailVerified: user.emailVerified,
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

function buildAuthenticatedResponse(res: Response, user: User) {
  const session = createSession(user.id);
  const token = signAccessToken(user.id, session.id);
  setSessionCookie(res, token);
  return {
    status: "authenticated" as const,
    user: sanitizeUser(user),
    token,
  };
}

async function issueVerificationChallenge(user: User, method: VerificationMethod) {
  const destination = method === "email" ? user.email : user.phoneNumber;
  if (!destination) {
    throw new Error(`No ${method} destination available for verification`);
  }
  const masked = method === "email" ? maskEmail(destination) : maskPhone(destination);
  const request = createVerificationRequest({
    userId: user.id,
    method,
    destination,
    maskedDestination: masked,
  });

  if (method === "email") {
    await sendEmailVerification(destination, request.code);
  } else {
    await sendSmsVerification(destination, request.code);
  }

  return toChallengePayload(request);
}

router.post("/register", async (req, res) => {
  const parseResult = registerSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ errors: parseResult.error.flatten() });
  }

  const { email, password, displayName, bio, preferredRole, verificationMethod } = parseResult.data;
  const phoneNumberRaw = parseResult.data.phoneNumber?.trim();
  const normalizedPhone = phoneNumberRaw?.replace(/\s+/g, "");
  const existing = getUserByEmail(email);
  if (existing && !existing.deletedAt) {
    return res.status(409).json({ message: "An account with that email already exists" });
  }

  const passwordHash = await argon2.hash(password);
  const roleChangeEligibleAt = new Date(Date.now() + roleChangeCooldownMs).toISOString();

  if (verificationMethod === "phone" && !normalizedPhone) {
    return res.status(400).json({ message: "Phone number required for SMS verification" });
  }

  const user = await createUser({
    email,
    passwordHash,
    displayName,
    bio,
    preferredRole,
    roleChangeEligibleAt,
    emailVerified: false,
    phoneNumber: normalizedPhone,
    phoneVerified: false,
    pendingVerificationMethod: verificationMethod,
  });

  try {
    const challenge = await issueVerificationChallenge(user, verificationMethod);
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
  const user = getUserByEmail(email);
  if (!user || user.deletedAt) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const passwordValid = await argon2.verify(user.passwordHash, password);
  if (!passwordValid) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  if (user.pendingVerificationMethod) {
    try {
      const challenge = await issueVerificationChallenge(user, user.pendingVerificationMethod);
      return res.json({ status: "verification_required", verification: challenge });
    } catch (err) {
      console.error("Failed to dispatch verification challenge", err);
      return res.status(500).json({ message: "Failed to initiate verification" });
    }
  }

  const responseBody = buildAuthenticatedResponse(res, user);
  return res.json(responseBody);
});

router.post("/logout", requireAuth, (req, res) => {
  if (req.authSession) {
    destroySession(req.authSession.id);
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

router.get("/verification/:requestId", (req, res) => {
  const parseResult = verificationLookupSchema.safeParse({ requestId: req.params.requestId });
  if (!parseResult.success) {
    return res.status(400).json({ errors: parseResult.error.flatten() });
  }

  const request = getRequest(parseResult.data.requestId);
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
  const request = getRequest(requestId);
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

  const refreshed = regenerateVerificationRequest(requestId);
  if (!refreshed) {
    return res.status(404).json({ message: "Verification request not found" });
  }

  const user = getUserById(refreshed.userId);
  if (!user || user.deletedAt) {
    clearVerificationForUser(refreshed.userId, refreshed.method);
    return res.status(404).json({ message: "Verification request not found" });
  }

  try {
    if (refreshed.method === "email") {
      await sendEmailVerification(refreshed.destination, refreshed.code);
    } else {
      await sendSmsVerification(refreshed.destination, refreshed.code);
    }
  } catch (err) {
    console.error("Failed to resend verification challenge", err);
    return res.status(500).json({ message: "Failed to resend verification" });
  }

  return res.json({ verification: toChallengePayload(refreshed) });
});

router.post("/verification/start", requireAuth, async (req, res) => {
  const parseResult = verificationStartSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ errors: parseResult.error.flatten() });
  }

  const { method } = parseResult.data;
  const phoneNumberInput = parseResult.data.phoneNumber?.trim();
  const currentUser = req.authUser!;
  const phoneNumber = method === "phone" ? phoneNumberInput ?? currentUser.phoneNumber : undefined;

  if (method === "phone" && !phoneNumber) {
    return res.status(400).json({ message: "Phone number is required for SMS verification" });
  }

  const patch: Parameters<typeof updateUser>[1] = {
    pendingVerificationMethod: method,
  };

  if (method === "phone" && phoneNumber !== undefined) {
    patch.phoneNumber = phoneNumber;
    patch.phoneVerified = false;
  }

  const updatedUser = updateUser(currentUser.id, patch);
  if (!updatedUser) {
    return res.status(404).json({ message: "User not found" });
  }

  req.authUser = updatedUser;

  try {
    const challenge = await issueVerificationChallenge(updatedUser, method);
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
  const result = consumeVerificationCode(requestId, code);

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
  const user = getUserById(request.userId);
  if (!user || user.deletedAt) {
    return res.status(404).json({ message: "User not found" });
  }

  const patch: Parameters<typeof updateUser>[1] = {
    pendingVerificationMethod:
      user.pendingVerificationMethod === request.method ? null : undefined,
    emailVerified: request.method === "email" ? true : undefined,
    phoneVerified: request.method === "phone" ? true : undefined,
  };

  const updatedUser = updateUser(user.id, patch);
  if (!updatedUser) {
    return res.status(404).json({ message: "User not found" });
  }

  clearVerificationForUser(updatedUser.id, request.method);

  const responseBody = buildAuthenticatedResponse(res, updatedUser);
  return res.json(responseBody);
});

router.put("/me", requireAuth, (req, res) => {
  const parseResult = updateSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ errors: parseResult.error.flatten() });
  }

  const updates = parseResult.data;
  const currentUser = req.authUser!;
  const patch: Parameters<typeof updateUser>[1] = {};

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

  if (updates.phoneNumber !== undefined) {
    if (updates.phoneNumber === null) {
      patch.phoneNumber = null;
      patch.phoneVerified = false;
    } else {
      patch.phoneNumber = updates.phoneNumber;
      patch.phoneVerified = false;
    }
  }

  const user = updateUser(currentUser.id, patch);

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  req.authUser = user;

  return res.json({ user: sanitizeUser(user) });
});

router.delete("/me", requireAuth, (req, res) => {
  const user = softDeleteUser(req.authUser!.id);
  if (user) {
    destroyAllSessionsForUser(user.id);
  }
  clearSessionCookie(res);
  return res.status(204).send();
});

export const authRouter = router;
