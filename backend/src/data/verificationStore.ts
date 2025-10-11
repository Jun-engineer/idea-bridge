import { randomUUID } from "crypto";
import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  TransactWriteCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { config } from "../config";
import { getDocumentClient, getTableName, isDynamoEnabled } from "../utils/dynamo";
import { generateNumericCode } from "../utils/otp";

export type VerificationMethod = "phone";

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

interface VerificationStore {
  createVerificationRequest(params: {
    userId: string;
    method: VerificationMethod;
    destination: string;
    maskedDestination: string;
  }): Promise<VerificationRequest>;
  regenerateVerificationRequest(requestId: string): Promise<VerificationRequest | null>;
  consumeVerificationCode(
    requestId: string,
    code: string,
  ): Promise<{
    success: boolean;
    request?: VerificationRequest;
    reason?: "expired" | "invalid" | "attempts-exhausted";
  }>;
  getRequest(requestId: string): Promise<VerificationRequest | null>;
  clearVerificationForUser(userId: string, method: VerificationMethod): Promise<void>;
  reset(): Promise<void>;
}

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

function createMemoryVerificationStore(): VerificationStore {
  const requestsById = new Map<string, VerificationRequest>();
  const requestsByUser = new Map<string, Map<VerificationMethod, string>>();

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

  return {
    async createVerificationRequest(params) {
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
    },
    async regenerateVerificationRequest(requestId) {
      const request = await this.getRequest(requestId);
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
    },
    async consumeVerificationCode(requestId, code) {
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
    },
    async getRequest(requestId) {
      const request = requestsById.get(requestId);
      if (!request) return null;
      if (new Date(request.expiresAt).getTime() <= Date.now()) {
        deleteRequest(request.id);
        return null;
      }
      return request;
    },
    async clearVerificationForUser(userId, method) {
      const existing = requestsByUser.get(userId)?.get(method);
      if (existing) {
        deleteRequest(existing);
      }
    },
    async reset() {
      requestsById.clear();
      requestsByUser.clear();
    },
  } satisfies VerificationStore;
}

const VERIFICATION_REQUEST_SK = "REQUEST";
const USER_VERIFICATION_PREFIX = (method: VerificationMethod) => `VERIFICATION#${method}#`;

const verificationPk = (requestId: string) => `VERIFICATION#${requestId}`;
const userPk = (userId: string) => `USER#${userId}`;
const userVerificationSk = (method: VerificationMethod, requestId: string) =>
  `${USER_VERIFICATION_PREFIX(method)}${requestId}`;

function toVerification(item: Record<string, any>): VerificationRequest {
  return {
    id: item.requestId,
    userId: item.userId,
    method: item.method,
    code: item.code,
    destination: item.destination,
    maskedDestination: item.maskedDestination,
    expiresAt: item.expiresAt,
    resendAvailableAt: item.resendAvailableAt,
    attemptsRemaining: item.attemptsRemaining,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function createDynamoVerificationStore(): VerificationStore {
  const resolvedTableName = getTableName();
  if (!resolvedTableName) {
    throw new Error("DynamoDB table name not configured for verification store");
  }
  const tableName = resolvedTableName;
  const docClient = getDocumentClient();

  async function deleteVerification(request: VerificationRequest) {
    await docClient.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Delete: {
              TableName: tableName,
              Key: {
                PK: verificationPk(request.id),
                SK: VERIFICATION_REQUEST_SK,
              },
            },
          },
          {
            Delete: {
              TableName: tableName,
              Key: {
                PK: userPk(request.userId),
                SK: userVerificationSk(request.method, request.id),
              },
            },
          },
        ],
      }),
    );
  }

  return {
    async createVerificationRequest({ userId, method, destination, maskedDestination }) {
      const existing = await docClient.send(
        new QueryCommand({
          TableName: tableName,
          KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
          ExpressionAttributeValues: {
            ":pk": userPk(userId),
            ":prefix": USER_VERIFICATION_PREFIX(method),
          },
          Limit: 1,
        }),
      );

      if (existing.Items && existing.Items.length > 0) {
        const current = await docClient.send(
          new GetCommand({
            TableName: tableName,
            Key: {
              PK: verificationPk(existing.Items[0].requestId as string),
              SK: VERIFICATION_REQUEST_SK,
            },
          }),
        );
        if (current.Item) {
          await deleteVerification(toVerification(current.Item));
        }
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

      await docClient.send(
        new TransactWriteCommand({
          TransactItems: [
            {
              Put: {
                TableName: tableName,
                Item: {
                  PK: verificationPk(request.id),
                  SK: VERIFICATION_REQUEST_SK,
                  entityType: "VERIFICATION",
                  requestId: request.id,
                  userId: request.userId,
                  method: request.method,
                  code: request.code,
                  destination: request.destination,
                  maskedDestination: request.maskedDestination,
                  expiresAt: request.expiresAt,
                  resendAvailableAt: request.resendAvailableAt,
                  attemptsRemaining: request.attemptsRemaining,
                  createdAt: request.createdAt,
                  updatedAt: request.updatedAt,
                },
              },
            },
            {
              Put: {
                TableName: tableName,
                Item: {
                  PK: userPk(userId),
                  SK: userVerificationSk(method, request.id),
                  entityType: "USER_VERIFICATION",
                  requestId: request.id,
                  method,
                },
              },
            },
          ],
        }),
      );

      return request;
    },
    async regenerateVerificationRequest(requestId) {
      const current = await this.getRequest(requestId);
      if (!current) return null;

      const updatedAt = now();
      const expiresAt = new Date(updatedAt.getTime() + config.verificationCodeTtlSeconds * 1000);
      const resendAvailableAt = new Date(
        updatedAt.getTime() + config.verificationResendCooldownSeconds * 1000,
      );

      const updated = await docClient.send(
        new UpdateCommand({
          TableName: tableName,
          Key: {
            PK: verificationPk(requestId),
            SK: VERIFICATION_REQUEST_SK,
          },
          UpdateExpression:
            "SET #code = :code, #expiresAt = :expiresAt, #resendAvailableAt = :resendAvailableAt, #attemptsRemaining = :attemptsRemaining, #updatedAt = :updatedAt",
          ExpressionAttributeNames: {
            "#code": "code",
            "#expiresAt": "expiresAt",
            "#resendAvailableAt": "resendAvailableAt",
            "#attemptsRemaining": "attemptsRemaining",
            "#updatedAt": "updatedAt",
          },
          ExpressionAttributeValues: {
            ":code": generateNumericCode(configuredCodeLength()),
            ":expiresAt": expiresAt.toISOString(),
            ":resendAvailableAt": resendAvailableAt.toISOString(),
            ":attemptsRemaining": configuredAttemptLimit(),
            ":updatedAt": updatedAt.toISOString(),
          },
          ReturnValues: "ALL_NEW",
        }),
      );

      return updated.Attributes ? toVerification(updated.Attributes) : null;
    },
    async consumeVerificationCode(requestId, code) {
      const current = await docClient.send(
        new GetCommand({
          TableName: tableName,
          Key: {
            PK: verificationPk(requestId),
            SK: VERIFICATION_REQUEST_SK,
          },
        }),
      );

      if (!current.Item) {
        return { success: false, reason: "expired" };
      }

      const request = toVerification(current.Item);

      if (new Date(request.expiresAt).getTime() <= Date.now()) {
        await deleteVerification(request);
        return { success: false, reason: "expired" };
      }

      if (request.code !== code) {
        const attemptsRemaining = request.attemptsRemaining - 1;
        if (attemptsRemaining <= 0) {
          await deleteVerification(request);
          return { success: false, reason: "attempts-exhausted" };
        }

        const updated = await docClient.send(
          new UpdateCommand({
            TableName: tableName,
            Key: {
              PK: verificationPk(requestId),
              SK: VERIFICATION_REQUEST_SK,
            },
            UpdateExpression: "SET #attemptsRemaining = :attemptsRemaining, #updatedAt = :updatedAt",
            ExpressionAttributeNames: {
              "#attemptsRemaining": "attemptsRemaining",
              "#updatedAt": "updatedAt",
            },
            ExpressionAttributeValues: {
              ":attemptsRemaining": attemptsRemaining,
              ":updatedAt": new Date().toISOString(),
            },
            ReturnValues: "ALL_NEW",
          }),
        );

        return {
          success: false,
          reason: "invalid",
          request: updated.Attributes ? toVerification(updated.Attributes) : request,
        };
      }

      await deleteVerification(request);
      return { success: true, request };
    },
    async getRequest(requestId) {
      const result = await docClient.send(
        new GetCommand({
          TableName: tableName,
          Key: {
            PK: verificationPk(requestId),
            SK: VERIFICATION_REQUEST_SK,
          },
        }),
      );

      if (!result.Item) {
        return null;
      }

      const request = toVerification(result.Item);
      if (new Date(request.expiresAt).getTime() <= Date.now()) {
        await deleteVerification(request);
        return null;
      }

      return request;
    },
    async clearVerificationForUser(userId, method) {
      const mappings = await docClient.send(
        new QueryCommand({
          TableName: tableName,
          KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
          ExpressionAttributeValues: {
            ":pk": userPk(userId),
            ":prefix": USER_VERIFICATION_PREFIX(method),
          },
        }),
      );

      if (!mappings.Items) {
        return;
      }

      for (const mapping of mappings.Items) {
        if (!mapping.requestId) continue;
        const requestResult = await docClient.send(
          new GetCommand({
            TableName: tableName,
            Key: {
              PK: verificationPk(mapping.requestId as string),
              SK: VERIFICATION_REQUEST_SK,
            },
          }),
        );
        if (requestResult.Item) {
          await deleteVerification(toVerification(requestResult.Item));
        }
      }
    },
    async reset() {
      // Avoid destructive operations against the shared DynamoDB table.
    },
  } satisfies VerificationStore;
}

const verificationStore: VerificationStore = isDynamoEnabled()
  ? createDynamoVerificationStore()
  : createMemoryVerificationStore();

export const createVerificationRequest = verificationStore.createVerificationRequest.bind(
  verificationStore,
);
export const regenerateVerificationRequest = verificationStore.regenerateVerificationRequest.bind(
  verificationStore,
);
export const consumeVerificationCode = verificationStore.consumeVerificationCode.bind(
  verificationStore,
);
export const getRequest = verificationStore.getRequest.bind(verificationStore);
export const clearVerificationForUser = verificationStore.clearVerificationForUser.bind(
  verificationStore,
);
export const resetVerificationStore = verificationStore.reset.bind(verificationStore);
