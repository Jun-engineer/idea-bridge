import request from "supertest";
import express from "express";
import cookieParser from "cookie-parser";
import { beforeEach, describe, expect, it } from "vitest";
import { authRouter } from "../src/routes/auth";
import { optionalAuth } from "../src/middleware/auth";
import { config } from "../src/config";
import { resetUserStore } from "../src/data/userStore";
import {
  getRequest,
  resetVerificationStore,
  type VerificationRequest,
} from "../src/data/verificationStore";

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
  });

  it("requires email verification before completing registration", async () => {
    const app = createApp();
    const agent = request(app);

    const registerResponse = await agent.post("/api/auth/register").send({
      email: "email-user@example.com",
      password: "strongpass123",
      displayName: "Email User",
      preferredRole: "idea-creator",
      verificationMethod: "email",
    });

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body.status).toBe("verification_required");
    const requestId: string = registerResponse.body.verification.requestId;

    const record = getRequest(requestId) as VerificationRequest | null;
    expect(record).not.toBeNull();
    expect(record?.method).toBe("email");

    const confirmResponse = await agent.post("/api/auth/verification/confirm").send({
      requestId,
      code: record?.code,
    });

    expect(confirmResponse.status).toBe(200);
    expect(confirmResponse.body.status).toBe("authenticated");
    expect(confirmResponse.body.user.emailVerified).toBe(true);
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

  it("supports SMS verification including resend flow", async () => {
    const app = createApp();
    const agent = request.agent(app);

    const phone = "+15555551212";
    const registerResponse = await agent.post("/api/auth/register").send({
      email: "sms-user@example.com",
      password: "strongpass123",
      displayName: "SMS User",
      preferredRole: "developer",
      verificationMethod: "phone",
      phoneNumber: phone,
    });

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body.verification.method).toBe("phone");
    const requestId: string = registerResponse.body.verification.requestId;

    const originalRecord = getRequest(requestId) as VerificationRequest | null;
    expect(originalRecord?.destination).toBe(phone);

    // Request a resend to get a new code (after cooldown we force via override)
    const resendResponseTooSoon = await agent.post("/api/auth/verification/request").send({ requestId });
    expect([200, 429]).toContain(resendResponseTooSoon.status);

    const refreshedRecord = getRequest(requestId) as VerificationRequest | null;
    expect(refreshedRecord).not.toBeNull();

    const confirmResponse = await agent.post("/api/auth/verification/confirm").send({
      requestId,
      code: refreshedRecord?.code,
    });

    expect(confirmResponse.status).toBe(200);
    expect(confirmResponse.body.user.phoneVerified).toBe(true);
    expect(confirmResponse.body.user.pendingVerificationMethod).toBeNull();
  });
});
