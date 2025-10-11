import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { config } from "../config";

const tableName = config.dataTableName;
const region = config.aws.region ?? process.env.AWS_REGION ?? "";
const endpoint = config.dynamoEndpoint ?? (process.env.DYNAMODB_ENDPOINT?.trim() ?? null);

let documentClient: DynamoDBDocumentClient | null = null;

function buildClient(): DynamoDBDocumentClient {
  if (documentClient) {
    return documentClient;
  }
  if (!tableName) {
    throw new Error("DynamoDB table name is not configured");
  }
  if (!region) {
    throw new Error("AWS region is required to use DynamoDB data store");
  }

  const baseConfig: ConstructorParameters<typeof DynamoDBClient>[0] = {
    region,
    ...(endpoint ? { endpoint } : {}),
  };

  if (config.aws.credentials.accessKeyId && config.aws.credentials.secretAccessKey) {
    baseConfig.credentials = {
      accessKeyId: config.aws.credentials.accessKeyId,
      secretAccessKey: config.aws.credentials.secretAccessKey,
      sessionToken: config.aws.credentials.sessionToken ?? undefined,
    };
  }

  const client = new DynamoDBClient(baseConfig);

  documentClient = DynamoDBDocumentClient.from(client, {
    marshallOptions: {
      convertEmptyValues: true,
      removeUndefinedValues: true,
    },
  });
  return documentClient;
}

export function getTableName(): string | null {
  return tableName;
}

export function isDynamoEnabled(): boolean {
  return Boolean(tableName);
}

export function getDocumentClient(): DynamoDBDocumentClient {
  return buildClient();
}
