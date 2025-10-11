import jwt from "jsonwebtoken";
import { config } from "../config";

interface TokenPayload {
  sub: string; // user id
  sid: string; // session id
}

export function signAccessToken(userId: string, sessionId: string): string {
  return jwt.sign({ sub: userId, sid: sessionId }, config.jwtSecret, {
    expiresIn: config.accessTokenTtlSeconds,
  });
}

export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, config.jwtSecret) as TokenPayload;
  } catch (error) {
    return null;
  }
}
