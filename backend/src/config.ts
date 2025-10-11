const REQUIRED_VARS = ["JWT_SECRET", "SESSION_COOKIE_NAME"] as const;

type RequiredVar = (typeof REQUIRED_VARS)[number];

function getEnvVar(name: RequiredVar): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var ${name}`);
  }
  return value;
}

export const config = {
  jwtSecret: getEnvVar("JWT_SECRET"),
  sessionCookieName: getEnvVar("SESSION_COOKIE_NAME"),
  accessTokenTtlSeconds: Number(process.env.ACCESS_TOKEN_TTL_SECONDS ?? 900),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  sessionCookieSecure: process.env.NODE_ENV === "production",
  roleChangeCooldownSeconds: Number(process.env.ROLE_CHANGE_COOLDOWN_SECONDS ?? 60 * 60 * 24),
  ideaSubmissionLimit: Number(process.env.IDEA_SUBMISSION_LIMIT ?? 5),
  appSubmissionLimit: Number(process.env.APP_SUBMISSION_LIMIT ?? 5),
  submissionWindowSeconds: Number(process.env.SUBMISSION_WINDOW_SECONDS ?? 60 * 60),
  verificationCodeLength: Number(process.env.VERIFICATION_CODE_LENGTH ?? 6),
  verificationCodeTtlSeconds: Number(process.env.VERIFICATION_CODE_TTL_SECONDS ?? 10 * 60),
  verificationResendCooldownSeconds: Number(
    process.env.VERIFICATION_RESEND_COOLDOWN_SECONDS ?? 60,
  ),
  verificationMaxAttempts: Number(process.env.VERIFICATION_MAX_ATTEMPTS ?? 5),
  verificationLoggingEnabled: process.env.VERIFICATION_LOGGING_ENABLED !== "false",
  aws: (() => {
    const region = process.env.AWS_REGION?.trim() ?? "";
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim() ?? "";
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim() ?? "";
    const sessionToken = process.env.AWS_SESSION_TOKEN?.trim() ?? "";
    const senderId = process.env.AWS_SNS_SENDER_ID?.trim() ?? "";
    const originationNumber = process.env.AWS_SNS_ORIGINATION_NUMBER?.trim() ?? "";
    const smsType = process.env.AWS_SNS_SMS_TYPE?.trim() || "Transactional";

    return {
      region: region || null,
      credentials: {
        accessKeyId: accessKeyId || null,
        secretAccessKey: secretAccessKey || null,
        sessionToken: sessionToken || null,
      } as const,
      sns: {
        region: region || null,
        senderId: senderId || null,
        originationNumber: originationNumber || null,
        smsType,
        enabled: Boolean(region),
      } as const,
    } as const;
  })(),
  dataTableName: process.env.DATA_TABLE_NAME?.trim() || null,
  dynamoEndpoint: process.env.DYNAMODB_ENDPOINT?.trim() || null,
};
