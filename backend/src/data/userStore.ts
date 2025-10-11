import { randomUUID } from "crypto";
import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  TransactWriteCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { config } from "../config";
import { getDocumentClient, getTableName, isDynamoEnabled } from "../utils/dynamo";
import type { Role, Session, User } from "../types";

interface CreateUserInput {
  email: string;
  passwordHash: string;
  displayName: string;
  bio?: string;
  preferredRole?: Role;
  roleChangeEligibleAt: string;
  phoneNumber?: string;
  phoneVerified?: boolean;
  pendingVerificationMethod?: "phone" | null;
}

interface UpdateUserInput {
  displayName?: string;
  bio?: string | null;
  preferredRole?: Role | null;
  roleChangeEligibleAt?: string;
  phoneNumber?: string | null;
  phoneVerified?: boolean;
  pendingVerificationMethod?: "phone" | null;
}

interface UserStore {
  seedUser(user: User): Promise<void>;
  createUser(data: CreateUserInput): Promise<User>;
  getUserByEmail(email: string): Promise<User | null>;
  getUserById(id: string): Promise<User | null>;
  updateUser(id: string, updates: UpdateUserInput): Promise<User | null>;
  softDeleteUser(id: string): Promise<User | null>;
  createSession(userId: string): Promise<Session>;
  getSession(sessionId: string): Promise<Session | null>;
  destroySession(sessionId: string): Promise<void>;
  destroyAllSessionsForUser(userId: string): Promise<void>;
  listUsers(): Promise<User[]>;
  reset(): Promise<void>;
}

const sessionTtlSeconds = Number(process.env.SESSION_TTL_SECONDS ?? 60 * 60 * 24 * 7);

function createMemoryStore(): UserStore {
  const usersById = new Map<string, User>();
  const userIdsByEmail = new Map<string, string>();
  const sessionsById = new Map<string, Session>();
  const sessionsByUserId = new Map<string, Set<string>>();

  return {
    async seedUser(user) {
      usersById.set(user.id, user);
      userIdsByEmail.set(user.email.toLowerCase(), user.id);
    },
    async createUser(data) {
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
        phoneNumber: data.phoneNumber,
        phoneVerified: data.phoneVerified ?? false,
        pendingVerificationMethod: data.pendingVerificationMethod ?? null,
      };

      usersById.set(id, user);
      userIdsByEmail.set(user.email, id);
      return user;
    },
    async getUserByEmail(email) {
      const id = userIdsByEmail.get(email.toLowerCase());
      if (!id) return null;
      return usersById.get(id) ?? null;
    },
    async getUserById(id) {
      return usersById.get(id) ?? null;
    },
    async updateUser(id, updates) {
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
        phoneNumber:
          updates.phoneNumber === null ? undefined : updates.phoneNumber ?? user.phoneNumber,
        phoneVerified: updates.phoneVerified ?? user.phoneVerified,
        pendingVerificationMethod:
          updates.pendingVerificationMethod === undefined
            ? user.pendingVerificationMethod
            : updates.pendingVerificationMethod,
      };

      usersById.set(id, patched);
      return patched;
    },
    async softDeleteUser(id) {
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
    },
    async createSession(userId) {
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
    },
    async getSession(sessionId) {
      const session = sessionsById.get(sessionId);
      if (!session) return null;
      if (new Date(session.expiresAt).getTime() <= Date.now()) {
        await this.destroySession(sessionId);
        return null;
      }
      return session;
    },
    async destroySession(sessionId) {
      const session = sessionsById.get(sessionId);
      if (!session) return;
      sessionsById.delete(sessionId);
      const userSessions = sessionsByUserId.get(session.userId);
      userSessions?.delete(sessionId);
      if (userSessions && userSessions.size === 0) {
        sessionsByUserId.delete(session.userId);
      }
    },
    async destroyAllSessionsForUser(userId) {
      const userSessions = sessionsByUserId.get(userId);
      if (!userSessions) return;
      for (const sessionId of userSessions) {
        sessionsById.delete(sessionId);
      }
      sessionsByUserId.delete(userId);
    },
    async listUsers() {
      return Array.from(usersById.values());
    },
    async reset() {
      usersById.clear();
      userIdsByEmail.clear();
      sessionsById.clear();
      sessionsByUserId.clear();
    },
  } as UserStore;
}

const USER_PROFILE_SK = "PROFILE";
const USER_EMAIL_SK = "PROFILE";
const SESSION_ITEM_SK = "SESSION";

const userPk = (userId: string) => `USER#${userId}`;
const userEmailPk = (email: string) => `USER_EMAIL#${email}`;
const sessionPk = (sessionId: string) => `SESSION#${sessionId}`;
const userSessionSk = (sessionId: string) => `SESSION#${sessionId}`;

function toUser(item: Record<string, any>): User {
  return {
    id: item.userId,
    email: item.email,
    passwordHash: item.passwordHash,
    displayName: item.displayName,
    bio: item.bio ?? undefined,
    preferredRole: item.preferredRole ?? undefined,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    deletedAt: item.deletedAt ?? null,
    roleChangeEligibleAt: item.roleChangeEligibleAt,
    phoneNumber: item.phoneNumber ?? undefined,
    phoneVerified: item.phoneVerified ?? false,
    pendingVerificationMethod: item.pendingVerificationMethod ?? null,
  };
}

function buildDynamoStore(): UserStore {
  const tableName = getTableName();
  if (!tableName) {
    throw new Error("DynamoDB table name not configured");
  }
  const docClient = getDocumentClient();

  return {
    async seedUser(user) {
      const loweredEmail = user.email.toLowerCase();
      const primaryItem = {
        PK: userPk(user.id),
        SK: USER_PROFILE_SK,
        entityType: "USER",
        userId: user.id,
        email: loweredEmail,
        passwordHash: user.passwordHash,
        displayName: user.displayName,
        bio: user.bio ?? undefined,
        preferredRole: user.preferredRole ?? undefined,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        deletedAt: user.deletedAt ?? null,
        roleChangeEligibleAt: user.roleChangeEligibleAt,
        phoneNumber: user.phoneNumber ?? undefined,
        phoneVerified: user.phoneVerified,
        pendingVerificationMethod: user.pendingVerificationMethod,
      };

      const emailItem = {
        PK: userEmailPk(loweredEmail),
        SK: USER_EMAIL_SK,
        entityType: "USER_EMAIL",
        userId: user.id,
        createdAt: user.createdAt,
      };

      await docClient.send(
        new TransactWriteCommand({
          TransactItems: [
            {
              Put: {
                TableName: tableName,
                Item: emailItem,
              },
            },
            {
              Put: {
                TableName: tableName,
                Item: primaryItem,
              },
            },
          ],
        }),
      );
    },
    async createUser(data) {
      const id = randomUUID();
      const now = new Date().toISOString();
      const loweredEmail = data.email.toLowerCase();
      const user: User = {
        id,
        email: loweredEmail,
        passwordHash: data.passwordHash,
        displayName: data.displayName,
        bio: data.bio ?? undefined,
        preferredRole: data.preferredRole,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        roleChangeEligibleAt: data.roleChangeEligibleAt,
        phoneNumber: data.phoneNumber,
        phoneVerified: data.phoneVerified ?? false,
        pendingVerificationMethod: data.pendingVerificationMethod ?? null,
      };

      await docClient.send(
        new TransactWriteCommand({
          TransactItems: [
            {
              Put: {
                TableName: tableName,
                Item: {
                  PK: userEmailPk(loweredEmail),
                  SK: USER_EMAIL_SK,
                  entityType: "USER_EMAIL",
                  userId: id,
                  createdAt: now,
                },
                ConditionExpression: "attribute_not_exists(PK)",
              },
            },
            {
              Put: {
                TableName: tableName,
                Item: {
                  PK: userPk(id),
                  SK: USER_PROFILE_SK,
                  entityType: "USER",
                  userId: id,
                  email: loweredEmail,
                  passwordHash: data.passwordHash,
                  displayName: data.displayName,
                  bio: data.bio ?? undefined,
                  preferredRole: data.preferredRole ?? undefined,
                  createdAt: now,
                  updatedAt: now,
                  deletedAt: null,
                  roleChangeEligibleAt: data.roleChangeEligibleAt,
                  phoneNumber: data.phoneNumber ?? undefined,
                  phoneVerified: data.phoneVerified ?? false,
                  pendingVerificationMethod: data.pendingVerificationMethod ?? null,
                },
                ConditionExpression: "attribute_not_exists(PK)",
              },
            },
          ],
        }),
      );

      return user;
    },
    async getUserByEmail(email) {
      const loweredEmail = email.toLowerCase();
      const emailResult = await docClient.send(
        new GetCommand({
          TableName: tableName,
          Key: {
            PK: userEmailPk(loweredEmail),
            SK: USER_EMAIL_SK,
          },
        }),
      );

      if (!emailResult.Item) {
        return null;
      }

      const userId = emailResult.Item.userId as string;
      return this.getUserById(userId);
    },
    async getUserById(id) {
      const result = await docClient.send(
        new GetCommand({
          TableName: tableName,
          Key: {
            PK: userPk(id),
            SK: USER_PROFILE_SK,
          },
        }),
      );

      if (!result.Item) {
        return null;
      }

      return toUser(result.Item);
    },
    async updateUser(id, updates) {
      const setExpressions: string[] = [];
      const removeExpressions: string[] = [];
      const values: Record<string, unknown> = {
        ":updatedAt": new Date().toISOString(),
      };
      const names: Record<string, string> = {
        "#updatedAt": "updatedAt",
      };

      if (updates.displayName !== undefined) {
        setExpressions.push("#displayName = :displayName");
        values[":displayName"] = updates.displayName;
        names["#displayName"] = "displayName";
      }

      if (updates.bio !== undefined) {
        if (updates.bio === null) {
          removeExpressions.push("#bio");
          names["#bio"] = "bio";
        } else {
          setExpressions.push("#bio = :bio");
          values[":bio"] = updates.bio;
          names["#bio"] = "bio";
        }
      }

      if (updates.preferredRole !== undefined) {
        if (updates.preferredRole === null) {
          removeExpressions.push("#preferredRole");
          names["#preferredRole"] = "preferredRole";
        } else {
          setExpressions.push("#preferredRole = :preferredRole");
          values[":preferredRole"] = updates.preferredRole;
          names["#preferredRole"] = "preferredRole";
        }
      }

      if (updates.roleChangeEligibleAt !== undefined) {
        setExpressions.push("#roleChangeEligibleAt = :roleChangeEligibleAt");
        values[":roleChangeEligibleAt"] = updates.roleChangeEligibleAt;
        names["#roleChangeEligibleAt"] = "roleChangeEligibleAt";
      }

      if (updates.phoneNumber !== undefined) {
        if (updates.phoneNumber === null) {
          removeExpressions.push("#phoneNumber");
          names["#phoneNumber"] = "phoneNumber";
        } else {
          setExpressions.push("#phoneNumber = :phoneNumber");
          values[":phoneNumber"] = updates.phoneNumber;
          names["#phoneNumber"] = "phoneNumber";
        }
      }

      if (updates.phoneVerified !== undefined) {
        setExpressions.push("#phoneVerified = :phoneVerified");
        values[":phoneVerified"] = updates.phoneVerified;
        names["#phoneVerified"] = "phoneVerified";
      }

      if (updates.pendingVerificationMethod !== undefined) {
        setExpressions.push("#pendingVerificationMethod = :pendingVerificationMethod");
        values[":pendingVerificationMethod"] = updates.pendingVerificationMethod;
        names["#pendingVerificationMethod"] = "pendingVerificationMethod";
      }

      if (setExpressions.length === 0 && removeExpressions.length === 0) {
        const existing = await this.getUserById(id);
        return existing;
      }

      const updateExpressionParts = [] as string[];
      if (setExpressions.length > 0) {
        updateExpressionParts.push(`SET ${setExpressions.join(", ")}, #updatedAt = :updatedAt`);
      } else {
        updateExpressionParts.push("SET #updatedAt = :updatedAt");
      }
      if (removeExpressions.length > 0) {
        updateExpressionParts.push(`REMOVE ${removeExpressions.join(", ")}`);
      }

      const updated = await docClient.send(
        new UpdateCommand({
          TableName: tableName,
          Key: {
            PK: userPk(id),
            SK: USER_PROFILE_SK,
          },
          UpdateExpression: updateExpressionParts.join(" "),
          ExpressionAttributeValues: values,
          ExpressionAttributeNames: names,
          ReturnValues: "ALL_NEW",
        }),
      );

      return updated.Attributes ? toUser(updated.Attributes) : null;
    },
    async softDeleteUser(id) {
      const now = new Date().toISOString();
      const updated = await docClient.send(
        new UpdateCommand({
          TableName: tableName,
          Key: {
            PK: userPk(id),
            SK: USER_PROFILE_SK,
          },
          UpdateExpression: "SET #deletedAt = :deletedAt, #updatedAt = :updatedAt",
          ExpressionAttributeNames: {
            "#deletedAt": "deletedAt",
            "#updatedAt": "updatedAt",
          },
          ExpressionAttributeValues: {
            ":deletedAt": now,
            ":updatedAt": now,
          },
          ReturnValues: "ALL_NEW",
        }),
      );

      if (updated.Attributes?.email) {
        await docClient.send(
          new DeleteCommand({
            TableName: tableName,
            Key: {
              PK: userEmailPk(updated.Attributes.email as string),
              SK: USER_EMAIL_SK,
            },
          }),
        );
      }

      return updated.Attributes ? toUser(updated.Attributes) : null;
    },
    async createSession(userId) {
      const id = randomUUID();
      const now = new Date();
      const expires = new Date(now.getTime() + sessionTtlSeconds * 1000);
      const ttl = Math.floor(expires.getTime() / 1000);

      await docClient.send(
        new TransactWriteCommand({
          TransactItems: [
            {
              Put: {
                TableName: tableName,
                Item: {
                  PK: sessionPk(id),
                  SK: SESSION_ITEM_SK,
                  entityType: "SESSION",
                  sessionId: id,
                  userId,
                  createdAt: now.toISOString(),
                  expiresAt: expires.toISOString(),
                  ttl,
                },
              },
            },
            {
              Put: {
                TableName: tableName,
                Item: {
                  PK: userPk(userId),
                  SK: userSessionSk(id),
                  entityType: "USER_SESSION",
                  sessionId: id,
                  userId,
                  expiresAt: expires.toISOString(),
                  ttl,
                },
              },
            },
          ],
        }),
      );

      return {
        id,
        userId,
        createdAt: now.toISOString(),
        expiresAt: expires.toISOString(),
      };
    },
    async getSession(sessionId) {
      const result = await docClient.send(
        new GetCommand({
          TableName: tableName,
          Key: {
            PK: sessionPk(sessionId),
            SK: SESSION_ITEM_SK,
          },
        }),
      );

      if (!result.Item) {
        return null;
      }

      const expiresAt = new Date(result.Item.expiresAt as string);
      if (expiresAt.getTime() <= Date.now()) {
        await this.destroySession(sessionId);
        return null;
      }

      return {
        id: result.Item.sessionId as string,
        userId: result.Item.userId as string,
        createdAt: result.Item.createdAt as string,
        expiresAt: result.Item.expiresAt as string,
      };
    },
    async destroySession(sessionId) {
      const session = await docClient.send(
        new GetCommand({
          TableName: tableName,
          Key: {
            PK: sessionPk(sessionId),
            SK: SESSION_ITEM_SK,
          },
        }),
      );

      if (!session.Item) {
        return;
      }

      const userId = session.Item.userId as string;

      await docClient.send(
        new TransactWriteCommand({
          TransactItems: [
            {
              Delete: {
                TableName: tableName,
                Key: {
                  PK: sessionPk(sessionId),
                  SK: SESSION_ITEM_SK,
                },
              },
            },
            {
              Delete: {
                TableName: tableName,
                Key: {
                  PK: userPk(userId),
                  SK: userSessionSk(sessionId),
                },
              },
            },
          ],
        }),
      );
    },
    async destroyAllSessionsForUser(userId) {
      const sessions = await docClient.send(
        new QueryCommand({
          TableName: tableName,
          KeyConditionExpression: "PK = :pk AND begins_with(SK, :sessionPrefix)",
          ExpressionAttributeValues: {
            ":pk": userPk(userId),
            ":sessionPrefix": "SESSION#",
          },
        }),
      );

      if (!sessions.Items || sessions.Count === 0) {
        return;
      }

      const batches = [] as string[][];
      let current: string[] = [];
      for (const item of sessions.Items) {
        current.push(item.sessionId as string);
        if (current.length === 25) {
          batches.push(current);
          current = [];
        }
      }
      if (current.length > 0) {
        batches.push(current);
      }

      for (const batch of batches) {
        await docClient.send(
          new TransactWriteCommand({
            TransactItems: batch.flatMap((sessionId) => [
              {
                Delete: {
                  TableName: tableName,
                  Key: {
                    PK: sessionPk(sessionId),
                    SK: SESSION_ITEM_SK,
                  },
                },
              },
              {
                Delete: {
                  TableName: tableName,
                  Key: {
                    PK: userPk(userId),
                    SK: userSessionSk(sessionId),
                  },
                },
              },
            ]),
          }),
        );
      }
    },
    async listUsers() {
      const results = await docClient.send(
        new ScanCommand({
          TableName: tableName,
          FilterExpression: "entityType = :type",
          ExpressionAttributeValues: {
            ":type": "USER",
          },
        }),
      );

      if (!results.Items) {
        return [];
      }

      return results.Items.map((item) => toUser(item));
    },
    async reset() {
      // Clearing the DynamoDB table is intentionally not implemented to avoid
      // destructive operations in shared environments. Tests should stub the data layer instead.
    },
  } as UserStore;
}

const store: UserStore = isDynamoEnabled() ? buildDynamoStore() : createMemoryStore();

export const seedUser = store.seedUser.bind(store);
export const createUser = store.createUser.bind(store);
export const getUserByEmail = store.getUserByEmail.bind(store);
export const getUserById = store.getUserById.bind(store);
export const updateUser = store.updateUser.bind(store);
export const softDeleteUser = store.softDeleteUser.bind(store);
export const createSession = store.createSession.bind(store);
export const getSession = store.getSession.bind(store);
export const destroySession = store.destroySession.bind(store);
export const destroyAllSessionsForUser = store.destroyAllSessionsForUser.bind(store);
export const listUsers = store.listUsers.bind(store);
export const resetUserStore = store.reset.bind(store);
