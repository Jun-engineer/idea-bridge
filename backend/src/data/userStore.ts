import { randomUUID } from "crypto";
import type { Role, Session, User } from "../types";

interface CreateUserInput {
  email: string;
  passwordHash: string;
  displayName: string;
  bio?: string;
  preferredRole?: Role;
  roleChangeEligibleAt: string;
  emailVerified?: boolean;
  phoneNumber?: string;
  phoneVerified?: boolean;
  pendingVerificationMethod?: "email" | "phone" | null;
}

interface UpdateUserInput {
  displayName?: string;
  bio?: string | null;
  preferredRole?: Role | null;
  roleChangeEligibleAt?: string;
  emailVerified?: boolean;
  phoneNumber?: string | null;
  phoneVerified?: boolean;
  pendingVerificationMethod?: "email" | "phone" | null;
}

const usersById = new Map<string, User>();
const userIdsByEmail = new Map<string, string>();

const sessionsById = new Map<string, Session>();
const sessionsByUserId = new Map<string, Set<string>>();

const sessionTtlSeconds = Number(process.env.SESSION_TTL_SECONDS ?? 60 * 60 * 24 * 7);

export function seedUser(user: User) {
  usersById.set(user.id, user);
  userIdsByEmail.set(user.email.toLowerCase(), user.id);
}

export async function createUser(data: CreateUserInput): Promise<User> {
  const id = randomUUID();
  const now = new Date().toISOString();
  const user: User = {
    id,
    email: data.email.toLowerCase(),
    passwordHash: data.passwordHash,
    displayName: data.displayName,
    bio: data.bio ?? undefined,
    preferredRole: data.preferredRole,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    roleChangeEligibleAt: data.roleChangeEligibleAt,
    emailVerified: data.emailVerified ?? false,
    phoneNumber: data.phoneNumber,
    phoneVerified: data.phoneVerified ?? false,
    pendingVerificationMethod: data.pendingVerificationMethod ?? null,
  };

  usersById.set(id, user);
  userIdsByEmail.set(user.email, id);

  return user;
}

export function getUserByEmail(email: string): User | null {
  const id = userIdsByEmail.get(email.toLowerCase());
  if (!id) return null;
  return usersById.get(id) ?? null;
}

export function getUserById(id: string): User | null {
  return usersById.get(id) ?? null;
}

export function updateUser(id: string, updates: UpdateUserInput): User | null {
  const user = usersById.get(id);
  if (!user) return null;

  const patched: User = {
    ...user,
    displayName: updates.displayName ?? user.displayName,
    bio: updates.bio === null ? undefined : updates.bio ?? user.bio,
    preferredRole:
      updates.preferredRole === null ? undefined : updates.preferredRole ?? user.preferredRole,
    updatedAt: new Date().toISOString(),
    roleChangeEligibleAt: updates.roleChangeEligibleAt ?? user.roleChangeEligibleAt,
    emailVerified: updates.emailVerified ?? user.emailVerified,
    phoneNumber: updates.phoneNumber === null ? undefined : updates.phoneNumber ?? user.phoneNumber,
    phoneVerified: updates.phoneVerified ?? user.phoneVerified,
    pendingVerificationMethod:
      updates.pendingVerificationMethod === undefined
        ? user.pendingVerificationMethod
        : updates.pendingVerificationMethod,
  };

  usersById.set(id, patched);
  return patched;
}

export function softDeleteUser(id: string): User | null {
  const user = usersById.get(id);
  if (!user) return null;

  const deleted: User = {
    ...user,
    deletedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  usersById.set(id, deleted);
  userIdsByEmail.delete(user.email);
  return deleted;
}

export function createSession(userId: string): Session {
  const id = randomUUID();
  const now = new Date();
  const expires = new Date(now.getTime() + sessionTtlSeconds * 1000);
  const session: Session = {
    id,
    userId,
    createdAt: now.toISOString(),
    expiresAt: expires.toISOString(),
  };

  sessionsById.set(id, session);
  if (!sessionsByUserId.has(userId)) {
    sessionsByUserId.set(userId, new Set());
  }
  sessionsByUserId.get(userId)!.add(id);

  return session;
}

export function getSession(sessionId: string): Session | null {
  const session = sessionsById.get(sessionId);
  if (!session) return null;
  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    destroySession(sessionId);
    return null;
  }
  return session;
}

export function destroySession(sessionId: string) {
  const session = sessionsById.get(sessionId);
  if (!session) return;
  sessionsById.delete(sessionId);
  const userSessions = sessionsByUserId.get(session.userId);
  userSessions?.delete(sessionId);
  if (userSessions && userSessions.size === 0) {
    sessionsByUserId.delete(session.userId);
  }
}

export function destroyAllSessionsForUser(userId: string) {
  const userSessions = sessionsByUserId.get(userId);
  if (!userSessions) return;
  for (const sessionId of userSessions) {
    sessionsById.delete(sessionId);
  }
  sessionsByUserId.delete(userId);
}

export function listUsers(): User[] {
  return Array.from(usersById.values());
}

export function resetUserStore() {
  usersById.clear();
  userIdsByEmail.clear();
  sessionsById.clear();
  sessionsByUserId.clear();
}
