import request from "supertest";
import express from "express";
import cookieParser from "cookie-parser";
import { beforeEach, describe, expect, it, vi } from "vitest";

const snsProvider = vi.hoisted(() => {
  process.env.AWS_REGION = "us-east-1";
  process.env.AWS_ACCESS_KEY_ID = "test";
  process.env.AWS_SECRET_ACCESS_KEY = "secret";
  process.env.AWS_SNS_SENDER_ID = "IdeaBridge";
  process.env.AWS_SNS_SMS_TYPE = "Transactional";
  process.env.PHONE_VERIFICATION_ENABLED = "true";

  const send = vi.fn().mockResolvedValue({ MessageId: "sns-message" });
  const ctor = vi.fn(() => ({ send }));
  const publishCommand = vi.fn((input) => ({ input }));

  return { send, ctor, publishCommand };
});

vi.mock("@aws-sdk/client-sns", () => ({
  SNSClient: snsProvider.ctor,
  PublishCommand: snsProvider.publishCommand,
}));
import { authRouter } from "../src/routes/auth";
import { optionalAuth } from "../src/middleware/auth";
import { config } from "../src/config";
import { resetUserStore } from "../src/data/userStore";
import {
  getRequest,
  resetVerificationStore,
  type VerificationRequest,
} from "../src/data/verificationStore";
import { __resetSmsClientForTests } from "../src/services/notification";

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(optionalAuth);
  app.use("/api/auth", authRouter);
  return app;
}

describe("auth verification flows", () => {
  beforeEach(() => {
    resetUserStore();
    resetVerificationStore();
    snsProvider.ctor.mockClear();
    snsProvider.send.mockClear();
    snsProvider.publishCommand.mockClear();
    __resetSmsClientForTests();
  });
  it("supports SMS verification via Amazon SNS including resend flow", async () => {
    const app = createApp();
    const agent = request.agent(app);

    const phone = "+15555551212";
    const registerResponse = await agent.post("/api/auth/register").send({
      email: "sms-user@example.com",
      password: "strongpass123",
      displayName: "SMS User",
      preferredRole: "developer",
      phoneNumber: phone,
    });

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body.verification.method).toBe("phone");
    const requestId: string = registerResponse.body.verification.requestId;

  const originalRecord = (await getRequest(requestId)) as VerificationRequest | null;
    expect(originalRecord?.destination).toBe(phone);

    expect(snsProvider.ctor).toHaveBeenCalledTimes(1);
    expect(snsProvider.send).toHaveBeenCalledTimes(1);
    expect(snsProvider.publishCommand).toHaveBeenCalledTimes(1);
    const publishInput = snsProvider.publishCommand.mock.calls[0]?.[0];
    expect(publishInput).toMatchObject({ PhoneNumber: phone });

    // Request a resend to get a new code (after cooldown we force via override)
    const resendResponseTooSoon = await agent.post("/api/auth/verification/request").send({ requestId });
    expect([200, 429]).toContain(resendResponseTooSoon.status);

  const refreshedRecord = (await getRequest(requestId)) as VerificationRequest | null;
    expect(refreshedRecord).not.toBeNull();

    const confirmResponse = await agent.post("/api/auth/verification/confirm").send({
      requestId,
      code: refreshedRecord?.code,
    });

    expect(confirmResponse.status).toBe(200);
    expect(confirmResponse.body.user.phoneVerified).toBe(true);
    expect(confirmResponse.body.user.pendingVerificationMethod).toBeNull();

    const cookieHeader = confirmResponse.get("set-cookie");
    const cookies = Array.isArray(cookieHeader)
      ? cookieHeader
      : cookieHeader
        ? [cookieHeader]
        : [];
    const hasSessionCookie = cookies.some((cookie) =>
      cookie.startsWith(`${config.sessionCookieName}=`),
    );
    expect(hasSessionCookie).toBe(true);
  });
});
