import { randomUUID } from "crypto";
import { GetCommand, ScanCommand, TransactWriteCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
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
  getByPhoneAndRole(phoneNumber: string, role: Role): Promise<PendingRegistration | null>;
  delete(id: string): Promise<void>;
  reset(): Promise<void>;
}

function createMemoryStore(): RegistrationStore {
  const registrationsById = new Map<string, PendingRegistration>();
  const registrationIdsByEmail = new Map<string, string>();
  const registrationIdsByPhoneRole = new Map<string, string>();

  const phoneRoleKey = (phoneNumber: string, role: Role) => `${phoneNumber}::${role}`;

  function setPhoneRoleMapping(registration: PendingRegistration) {
    if (!registration.phoneNumber || !registration.preferredRole) {
      return;
    }
    registrationIdsByPhoneRole.set(phoneRoleKey(registration.phoneNumber, registration.preferredRole), registration.id);
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
    async upsertRegistration(input) {
      const loweredEmail = input.email.toLowerCase();
      const existingId = registrationIdsByEmail.get(loweredEmail);
      const now = new Date().toISOString();

      if (existingId) {
        const existing = registrationsById.get(existingId);
        if (!existing) {
          registrationIdsByEmail.delete(loweredEmail);
        } else {
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
          removePhoneRoleMapping(existing);
          setPhoneRoleMapping(updated);
          return updated;
        }
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
      registrationIdsByEmail.set(loweredEmail, id);
      setPhoneRoleMapping(created);
      return created;
    },
    async getById(id) {
      return registrationsById.get(id) ?? null;
    },
    async getByEmail(email) {
      const id = registrationIdsByEmail.get(email.toLowerCase());
      if (!id) return null;
      return registrationsById.get(id) ?? null;
    },
    async getByPhoneAndRole(phoneNumber, role) {
      if (!phoneNumber || !role) {
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
    async delete(id) {
      const existing = registrationsById.get(id);
      if (!existing) return;
      registrationsById.delete(id);
      registrationIdsByEmail.delete(existing.email);
      removePhoneRoleMapping(existing);
    },
    async reset() {
      registrationsById.clear();
      registrationIdsByEmail.clear();
      registrationIdsByPhoneRole.clear();
    },
  } satisfies RegistrationStore;
}

const REGISTRATION_ITEM_SK = "REGISTRATION";
const REGISTRATION_EMAIL_SK = "REGISTRATION_EMAIL";

const registrationPk = (registrationId: string) => `REGISTRATION#${registrationId}`;
const registrationEmailPk = (email: string) => `REGISTRATION_EMAIL#${email}`;

function createDynamoStore(): RegistrationStore {
  const tableName = getTableName();
  if (!tableName) {
    throw new Error("DynamoDB table name not configured for registration store");
  }
  const docClient = getDocumentClient();

  return {
    async upsertRegistration(input) {
      const loweredEmail = input.email.toLowerCase();
      const nowIso = new Date().toISOString();

      const existing = await this.getByEmail(loweredEmail);
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
              },
            },
            {
              Put: {
                TableName: tableName,
                Item: {
                  PK: registrationEmailPk(loweredEmail),
                  SK: REGISTRATION_EMAIL_SK,
                  entityType: "PENDING_REGISTRATION_EMAIL",
                  registrationId: id,
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
    async getById(id) {
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
    async getByEmail(email) {
      const loweredEmail = email.toLowerCase();
      const emailLookup = await docClient.send(
        new GetCommand({
          TableName: tableName,
          Key: {
            PK: registrationEmailPk(loweredEmail),
            SK: REGISTRATION_EMAIL_SK,
          },
        }),
      );

      if (!emailLookup.Item) {
        return null;
      }

      const registrationId = emailLookup.Item.registrationId as string;
      return this.getById(registrationId);
    },
    async getByPhoneAndRole(phoneNumber, role) {
      if (!phoneNumber || !role) {
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
    async delete(id) {
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
                  PK: registrationEmailPk(existing.email),
                  SK: REGISTRATION_EMAIL_SK,
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
export const getPendingRegistrationByPhoneAndRole = store.getByPhoneAndRole.bind(store);
export const deletePendingRegistration = store.delete.bind(store);
export const resetPendingRegistrationStore = store.reset.bind(store);
