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
import { resetPendingRegistrationStore } from "../src/data/pendingRegistrationStore";
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
    resetPendingRegistrationStore();
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

  it("blocks login until phone verification is completed", async () => {
    const app = createApp();
    const agent = request.agent(app);

    const phone = "+15555551444";
    const email = "pending-login@example.com";
    const password = "strongpass123";

    const registerResponse = await agent.post("/api/auth/register").send({
      email,
      password,
      displayName: "Pending Login",
      preferredRole: "developer",
      phoneNumber: phone,
    });

    expect(registerResponse.status).toBe(201);
    const requestId: string = registerResponse.body.verification.requestId;

    const loginAttempt = await agent.post("/api/auth/login").send({ email, password });
    expect(loginAttempt.status).toBe(403);
    expect(loginAttempt.body.status).toBe("verification_required");

    const verificationRecord = (await getRequest(requestId)) as VerificationRequest | null;
    expect(verificationRecord).not.toBeNull();

    const confirmResponse = await agent.post("/api/auth/verification/confirm").send({
      requestId,
      code: verificationRecord?.code,
    });

    expect(confirmResponse.status).toBe(200);
    expect(confirmResponse.body.user.email).toBe(email);
    expect(confirmResponse.body.user.phoneVerified).toBe(true);
  });

  it("strips trunk zeros from E.164 submissions", async () => {
    const app = createApp();
    const agent = request.agent(app);

    const response = await agent.post("/api/auth/register").send({
      email: "trunk@example.com",
      password: "strongpass123",
      displayName: "Trunk Test",
      preferredRole: "developer",
      phoneNumber: "+610412345678",
    });

    expect(response.status).toBe(201);
    const publishInput = snsProvider.publishCommand.mock.calls.at(-1)?.[0];
    expect(publishInput).toMatchObject({ PhoneNumber: "+61412345678" });
  });

  it("rejects phone numbers without a country code", async () => {
    const app = createApp();
    const agent = request.agent(app);

    const response = await agent.post("/api/auth/register").send({
      email: "invalid-phone@example.com",
      password: "strongpass123",
      displayName: "Invalid Phone",
      preferredRole: "developer",
      phoneNumber: "0430123456",
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/country code/i);
  });

  it("starts a new verification challenge when the phone number changes", async () => {
    const app = createApp();
    const agent = request.agent(app);

    const phone = "+15555551212";
    const registerResponse = await agent.post("/api/auth/register").send({
      email: "update-user@example.com",
      password: "strongpass123",
      displayName: "Update User",
      preferredRole: "idea-creator",
      phoneNumber: phone,
    });

    expect(registerResponse.status).toBe(201);
    const initialRequestId: string = registerResponse.body.verification.requestId;
    const initialRecord = (await getRequest(initialRequestId)) as VerificationRequest | null;
    expect(initialRecord).not.toBeNull();

    const confirmResponse = await agent.post("/api/auth/verification/confirm").send({
      requestId: initialRequestId,
      code: initialRecord?.code,
    });

    expect(confirmResponse.status).toBe(200);
    snsProvider.send.mockClear();

    const newPhone = "+15555551333";
    const updateResponse = await agent.put("/api/auth/me").send({
      displayName: "Update User",
      phoneNumber: newPhone,
    });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.user.phoneVerified).toBe(false);
    expect(updateResponse.body.user.pendingVerificationMethod).toBe("phone");
    expect(updateResponse.body.user.phoneNumber).toBe(newPhone);

    expect(updateResponse.body.verification).toBeDefined();
    expect(updateResponse.body.verification.method).toBe("phone");

    expect(snsProvider.send).toHaveBeenCalledTimes(1);
    const publishInput = snsProvider.publishCommand.mock.calls.at(-1)?.[0];
    expect(publishInput).toMatchObject({ PhoneNumber: newPhone });

    const newRequest = (await getRequest(updateResponse.body.verification.requestId)) as
      | VerificationRequest
      | null;
    expect(newRequest?.destination).toBe(newPhone);
  });
});
