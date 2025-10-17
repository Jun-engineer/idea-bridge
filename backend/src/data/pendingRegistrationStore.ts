import { randomUUID } from "crypto";
import {
  DeleteCommand,
  GetCommand,
  QueryCommand,
  ScanCommand,
  TransactWriteCommand,
  UpdateCommand,
  type QueryCommandOutput,
} from "@aws-sdk/lib-dynamodb";
import { getDocumentClient, getTableName, isDynamoEnabled } from "../utils/dynamo";
import type { Role } from "../types";

export interface PendingRegistration {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  bio?: string;
  preferredRole?: Role;
  roleChangeEligibleAt: string;
  phoneNumber: string;
  createdAt: string;
  updatedAt: string;
}

type UpsertRegistrationInput = {
  email: string;
  passwordHash: string;
  displayName: string;
  bio?: string;
  preferredRole?: Role;
  roleChangeEligibleAt: string;
  phoneNumber: string;
};

interface RegistrationStore {
  upsertRegistration(input: UpsertRegistrationInput): Promise<PendingRegistration>;
  getById(id: string): Promise<PendingRegistration | null>;
  getByEmail(email: string): Promise<PendingRegistration | null>;
  getByEmailAndRole(email: string, role: Role | null): Promise<PendingRegistration | null>;
  getByPhoneAndRole(phoneNumber: string, role: Role): Promise<PendingRegistration | null>;
  delete(id: string): Promise<void>;
  reset(): Promise<void>;
}

function createMemoryStore(): RegistrationStore {
  const registrationsById = new Map<string, PendingRegistration>();
  const registrationIdsByEmail = new Map<string, Set<string>>();
  const registrationIdsByEmailRole = new Map<string, string>();
  const registrationIdsByPhoneRole = new Map<string, string>();

  const phoneRoleKey = (phoneNumber: string, role: Role) => `${phoneNumber}::${role}`;
  const emailRoleKey = (email: string, role: Role | null | undefined) =>
    `${email}::${role ?? "none"}`;

  function setEmailMapping(registration: PendingRegistration) {
    const email = registration.email.toLowerCase();
    if (!registrationIdsByEmail.has(email)) {
      registrationIdsByEmail.set(email, new Set());
    }
    registrationIdsByEmail.get(email)!.add(registration.id);

    const key = emailRoleKey(email, registration.preferredRole ?? null);
    registrationIdsByEmailRole.set(key, registration.id);
  }

  function removeEmailMapping(registration: PendingRegistration) {
    const email = registration.email.toLowerCase();
    const ids = registrationIdsByEmail.get(email);
    if (ids) {
      ids.delete(registration.id);
      if (ids.size === 0) {
        registrationIdsByEmail.delete(email);
      }
    }

    const key = emailRoleKey(email, registration.preferredRole ?? null);
    const existingId = registrationIdsByEmailRole.get(key);
    if (existingId === registration.id) {
      registrationIdsByEmailRole.delete(key);
    }
  }

  function setPhoneRoleMapping(registration: PendingRegistration) {
    if (!registration.phoneNumber || !registration.preferredRole) {
      return;
    }
    registrationIdsByPhoneRole.set(
      phoneRoleKey(registration.phoneNumber, registration.preferredRole),
      registration.id,
    );
  }

  function removePhoneRoleMapping(registration: PendingRegistration) {
    if (!registration.phoneNumber || !registration.preferredRole) {
      return;
    }
    const key = phoneRoleKey(registration.phoneNumber, registration.preferredRole);
    const existingId = registrationIdsByPhoneRole.get(key);
    if (existingId === registration.id) {
      registrationIdsByPhoneRole.delete(key);
    }
  }

  return {
    async upsertRegistration(input: UpsertRegistrationInput) {
      const loweredEmail = input.email.toLowerCase();
      const roleKey = emailRoleKey(loweredEmail, input.preferredRole ?? null);
      const now = new Date().toISOString();

      const existingId = registrationIdsByEmailRole.get(roleKey);
      if (existingId) {
        const existing = registrationsById.get(existingId);
        if (existing) {
          const updated: PendingRegistration = {
            ...existing,
            passwordHash: input.passwordHash,
            displayName: input.displayName,
            bio: input.bio,
            preferredRole: input.preferredRole,
            roleChangeEligibleAt: input.roleChangeEligibleAt,
            phoneNumber: input.phoneNumber,
            updatedAt: now,
          };
          registrationsById.set(existingId, updated);
          removeEmailMapping(existing);
          setEmailMapping(updated);
          removePhoneRoleMapping(existing);
          setPhoneRoleMapping(updated);
          return updated;
        }
        registrationIdsByEmailRole.delete(roleKey);
      }

      const id = randomUUID();
      const created: PendingRegistration = {
        id,
        email: loweredEmail,
        passwordHash: input.passwordHash,
        displayName: input.displayName,
        bio: input.bio,
        preferredRole: input.preferredRole,
        roleChangeEligibleAt: input.roleChangeEligibleAt,
        phoneNumber: input.phoneNumber,
        createdAt: now,
        updatedAt: now,
      };

      registrationsById.set(id, created);
      setEmailMapping(created);
      setPhoneRoleMapping(created);
      return created;
    },
    async getById(id: string) {
      return registrationsById.get(id) ?? null;
    },
    async getByEmail(email: string) {
      const ids = registrationIdsByEmail.get(email.toLowerCase());
      if (!ids || ids.size === 0) {
        return null;
      }
      for (const id of ids) {
        const registration = registrationsById.get(id);
        if (registration) {
          return registration;
        }
        ids.delete(id);
      }
      return null;
    },
    async getByEmailAndRole(email: string, role: Role | null) {
      const key = emailRoleKey(email.toLowerCase(), role);
      const id = registrationIdsByEmailRole.get(key);
      if (!id) {
        return null;
      }
      const registration = registrationsById.get(id) ?? null;
      if (!registration) {
        registrationIdsByEmailRole.delete(key);
      }
      return registration;
    },
    async getByPhoneAndRole(phoneNumber: string, role: Role) {
      if (!phoneNumber) {
        return null;
      }
      const key = phoneRoleKey(phoneNumber, role);
      const id = registrationIdsByPhoneRole.get(key);
      if (!id) {
        return null;
      }
      const registration = registrationsById.get(id) ?? null;
      if (!registration) {
        registrationIdsByPhoneRole.delete(key);
      }
      return registration;
    },
    async delete(id: string) {
      const existing = registrationsById.get(id);
      if (!existing) return;
      registrationsById.delete(id);
      removeEmailMapping(existing);
      removePhoneRoleMapping(existing);
    },
    async reset() {
      registrationsById.clear();
      registrationIdsByEmail.clear();
      registrationIdsByEmailRole.clear();
      registrationIdsByPhoneRole.clear();
    },
  } satisfies RegistrationStore;
}

const REGISTRATION_ITEM_SK = "REGISTRATION";
const REGISTRATION_EMAIL_ROLE_PREFIX = "REGISTRATION_EMAIL_ROLE#";

const registrationPk = (registrationId: string) => `REGISTRATION#${registrationId}`;
const registrationEmailPk = (email: string) => `REGISTRATION_EMAIL#${email}`;
const registrationEmailRoleSk = (role: Role | null | undefined) =>
  `${REGISTRATION_EMAIL_ROLE_PREFIX}${role ?? "none"}`;

function createDynamoStore(): RegistrationStore {
  const tableName = getTableName();
  if (!tableName) {
    throw new Error("DynamoDB table name not configured for registration store");
  }
  const docClient = getDocumentClient();

  return {
    async upsertRegistration(input: UpsertRegistrationInput) {
      const loweredEmail = input.email.toLowerCase();
      const nowIso = new Date().toISOString();
      const role = input.preferredRole ?? null;

      const existing = await this.getByEmailAndRole(loweredEmail, role);
      if (existing) {
        await docClient.send(
          new UpdateCommand({
            TableName: tableName,
            Key: {
              PK: registrationPk(existing.id),
              SK: REGISTRATION_ITEM_SK,
            },
            UpdateExpression:
              "SET #passwordHash = :passwordHash, #displayName = :displayName, #bio = :bio, #preferredRole = :preferredRole, #roleChangeEligibleAt = :roleChangeEligibleAt, #phoneNumber = :phoneNumber, #updatedAt = :updatedAt",
            ExpressionAttributeNames: {
              "#passwordHash": "passwordHash",
              "#displayName": "displayName",
              "#bio": "bio",
              "#preferredRole": "preferredRole",
              "#roleChangeEligibleAt": "roleChangeEligibleAt",
              "#phoneNumber": "phoneNumber",
              "#updatedAt": "updatedAt",
            },
            ExpressionAttributeValues: {
              ":passwordHash": input.passwordHash,
              ":displayName": input.displayName,
              ":bio": input.bio ?? null,
              ":preferredRole": input.preferredRole ?? null,
              ":roleChangeEligibleAt": input.roleChangeEligibleAt,
              ":phoneNumber": input.phoneNumber,
              ":updatedAt": nowIso,
            },
            ReturnValues: "ALL_NEW",
          }),
        );

        return (await this.getById(existing.id))!;
      }

      const id = randomUUID();
      const createdAt = nowIso;
      const created: PendingRegistration = {
        id,
        email: loweredEmail,
        passwordHash: input.passwordHash,
        displayName: input.displayName,
        bio: input.bio,
        preferredRole: input.preferredRole,
        roleChangeEligibleAt: input.roleChangeEligibleAt,
        phoneNumber: input.phoneNumber,
        createdAt,
        updatedAt: createdAt,
      };

      await docClient.send(
        new TransactWriteCommand({
          TransactItems: [
            {
              Put: {
                TableName: tableName,
                Item: {
                  PK: registrationPk(id),
                  SK: REGISTRATION_ITEM_SK,
                  entityType: "PENDING_REGISTRATION",
                  registrationId: id,
                  email: loweredEmail,
                  passwordHash: input.passwordHash,
                  displayName: input.displayName,
                  bio: input.bio ?? null,
                  preferredRole: input.preferredRole ?? null,
                  roleChangeEligibleAt: input.roleChangeEligibleAt,
                  phoneNumber: input.phoneNumber,
                  createdAt,
                  updatedAt: createdAt,
                },
                ConditionExpression: "attribute_not_exists(PK)",
              },
            },
            {
              Put: {
                TableName: tableName,
                Item: {
                  PK: registrationEmailPk(loweredEmail),
                  SK: registrationEmailRoleSk(role),
                  entityType: "PENDING_REGISTRATION_EMAIL",
                  registrationId: id,
                  role,
                  createdAt,
                },
                ConditionExpression: "attribute_not_exists(PK)",
              },
            },
          ],
        }),
      );

      return created;
    },
    async getById(id: string) {
      const result = await docClient.send(
        new GetCommand({
          TableName: tableName,
          Key: {
            PK: registrationPk(id),
            SK: REGISTRATION_ITEM_SK,
          },
        }),
      );

      if (!result.Item) {
        return null;
      }

      return {
        id,
        email: result.Item.email as string,
        passwordHash: result.Item.passwordHash as string,
        displayName: result.Item.displayName as string,
        bio: result.Item.bio ?? undefined,
        preferredRole: result.Item.preferredRole ?? undefined,
        roleChangeEligibleAt: result.Item.roleChangeEligibleAt as string,
        phoneNumber: result.Item.phoneNumber as string,
        createdAt: result.Item.createdAt as string,
        updatedAt: result.Item.updatedAt as string,
      } satisfies PendingRegistration;
    },
    async getByEmail(email: string) {
      const loweredEmail = email.toLowerCase();
      const lookup = (await docClient.send(
        new QueryCommand({
          TableName: tableName,
          KeyConditionExpression: "PK = :pk",
          ExpressionAttributeValues: {
            ":pk": registrationEmailPk(loweredEmail),
          },
          Limit: 1,
        }),
      )) as QueryCommandOutput;

      if (!lookup.Items || lookup.Items.length === 0) {
        return null;
      }

      const registrationId = lookup.Items[0].registrationId as string;
      return this.getById(registrationId);
    },
  async getByEmailAndRole(email: string, role: Role | null) {
      const loweredEmail = email.toLowerCase();
      const mapping = await docClient.send(
        new GetCommand({
          TableName: tableName,
          Key: {
            PK: registrationEmailPk(loweredEmail),
            SK: registrationEmailRoleSk(role),
          },
        }),
      );

      if (!mapping.Item) {
        return null;
      }

      const registrationId = mapping.Item.registrationId as string;
      const registration = await this.getById(registrationId);
      if (!registration) {
        await docClient
          .send(
            new DeleteCommand({
              TableName: tableName,
              Key: {
                PK: registrationEmailPk(loweredEmail),
                SK: registrationEmailRoleSk(role),
              },
            }),
          )
          .catch(() => {
            // Mapping already removed or concurrent deletion; ignore.
          });
        return null;
      }

      return registration;
    },
    async getByPhoneAndRole(phoneNumber: string, role: Role) {
      if (!phoneNumber) {
        return null;
      }

      let lastEvaluatedKey: Record<string, unknown> | undefined;
      do {
        const scanResult = await docClient.send(
          new ScanCommand({
            TableName: tableName,
            FilterExpression:
              "#entityType = :entityType AND #phoneNumber = :phone AND #preferredRole = :role",
            ExpressionAttributeNames: {
              "#entityType": "entityType",
              "#phoneNumber": "phoneNumber",
              "#preferredRole": "preferredRole",
            },
            ExpressionAttributeValues: {
              ":entityType": "PENDING_REGISTRATION",
              ":phone": phoneNumber,
              ":role": role,
            },
            ExclusiveStartKey: lastEvaluatedKey,
          }),
        );

        if (scanResult.Items && scanResult.Items.length > 0) {
          const item = scanResult.Items[0];
          return {
            id: item.registrationId as string,
            email: item.email as string,
            passwordHash: item.passwordHash as string,
            displayName: item.displayName as string,
            bio: item.bio ?? undefined,
            preferredRole: item.preferredRole ?? undefined,
            roleChangeEligibleAt: item.roleChangeEligibleAt as string,
            phoneNumber: item.phoneNumber as string,
            createdAt: item.createdAt as string,
            updatedAt: item.updatedAt as string,
          } satisfies PendingRegistration;
        }

        lastEvaluatedKey = scanResult.LastEvaluatedKey as Record<string, unknown> | undefined;
      } while (lastEvaluatedKey);

      return null;
    },
    async delete(id: string) {
      const existing = await this.getById(id);
      if (!existing) {
        return;
      }

      await docClient.send(
        new TransactWriteCommand({
          TransactItems: [
            {
              Delete: {
                TableName: tableName,
                Key: {
                  PK: registrationPk(id),
                  SK: REGISTRATION_ITEM_SK,
                },
              },
            },
            {
              Delete: {
                TableName: tableName,
                Key: {
                  PK: registrationEmailPk(existing.email.toLowerCase()),
                  SK: registrationEmailRoleSk(existing.preferredRole ?? null),
                },
              },
            },
          ],
        }),
      );
    },
    async reset() {
      // Intentionally left blank for Dynamo-backed store to avoid destructive
      // operations in shared environments. Tests should stub the data layer.
    },
  } satisfies RegistrationStore;
}

const store: RegistrationStore = isDynamoEnabled() ? createDynamoStore() : createMemoryStore();

export const upsertPendingRegistration = store.upsertRegistration.bind(store);
export const getPendingRegistrationById = store.getById.bind(store);
export const getPendingRegistrationByEmail = store.getByEmail.bind(store);
export const getPendingRegistrationByEmailAndRole = store.getByEmailAndRole.bind(store);
export const getPendingRegistrationByPhoneAndRole = store.getByPhoneAndRole.bind(store);
export const deletePendingRegistration = store.delete.bind(store);
export const resetPendingRegistrationStore = store.reset.bind(store);
