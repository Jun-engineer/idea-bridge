import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { config } from "../config";

interface VerificationMessage {
  destination: string;
  code: string;
}

let snsClient: SNSClient | null = null;

function log(message: VerificationMessage) {
  if (config.verificationLoggingEnabled) {
    console.info(
      `[Verification:SMS] Sending code ${message.code} to ${message.destination}`,
    );
  }
}

function ensureSnsClient(): SNSClient | null {
  if (!config.aws.sns.enabled) {
    return null;
  }

  if (!snsClient) {
    const clientConfig: ConstructorParameters<typeof SNSClient>[0] = {
      region: config.aws.sns.region!,
    };

    if (config.aws.credentials.accessKeyId && config.aws.credentials.secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId: config.aws.credentials.accessKeyId,
        secretAccessKey: config.aws.credentials.secretAccessKey,
        sessionToken: config.aws.credentials.sessionToken ?? undefined,
      };
    }

    snsClient = new SNSClient(clientConfig);
  }

  return snsClient;
}

export async function sendSmsVerification(destination: string, code: string): Promise<void> {
  const client = ensureSnsClient();
  if (!client) {
    console.warn(
      "AWS SNS configuration missing: skipping SMS delivery. Configure AWS_REGION and credentials to enable verification texts.",
    );
    log({ destination, code });
    return;
  }

  const ttlMinutes = Math.ceil(config.verificationCodeTtlSeconds / 60);
  const message = `IdeaBridge verification code: ${code} (expires in ${ttlMinutes} minute${ttlMinutes === 1 ? "" : "s"}).`;

  const attributes: Record<string, { DataType: "String"; StringValue: string }> = {
    "AWS.SNS.SMS.MessageType": {
      DataType: "String",
      StringValue: config.aws.sns.smsType,
    },
  };

  if (config.aws.sns.senderId) {
    attributes["AWS.SNS.SMS.SenderID"] = {
      DataType: "String",
      StringValue: config.aws.sns.senderId,
    };
  }

  if (config.aws.sns.originationNumber) {
    attributes["AWS.MM.SMS.OriginationNumber"] = {
      DataType: "String",
      StringValue: config.aws.sns.originationNumber,
    };
  }

  await client.send(
    new PublishCommand({
      PhoneNumber: destination,
      Message: message,
      MessageAttributes: attributes,
    }),
  );

  log({ destination, code });
}

export function __resetSmsClientForTests() {
  snsClient = null;
}
