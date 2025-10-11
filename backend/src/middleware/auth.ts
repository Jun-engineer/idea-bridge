import type { NextFunction, Request, Response } from "express";
import { config } from "../config";
import { destroySession, getSession, getUserById } from "../data/userStore";
import { verifyAccessToken } from "../utils/jwt";

function extractToken(req: Request): string | null {
  const cookieToken = req.cookies?.[config.sessionCookieName];
  if (cookieToken) {
    return cookieToken;
  }

  const authHeader = req.header("authorization") ?? req.header("Authorization");
  if (!authHeader) return null;
  if (!authHeader.startsWith("Bearer ")) return null;
  return authHeader.substring("Bearer ".length);
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  (async () => {
    const token = extractToken(req);
    if (!token) {
      return next();
    }
    const payload = verifyAccessToken(token);
    if (!payload) {
      return next();
    }
    const session = await getSession(payload.sid);
    if (!session) {
      return next();
    }
    const user = await getUserById(payload.sub);
    if (!user || user.deletedAt) {
      await destroySession(session.id);
      return next();
    }
    req.authUser = user;
    req.authSession = session;
    return next();
  })().catch((err) => next(err));
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  optionalAuth(req, res, (err?: unknown) => {
    if (err) {
      return next(err);
    }
    if (!req.authUser || !req.authSession) {
      return res.status(401).json({ message: "Authentication required" });
    }
    return next();
  });
}
