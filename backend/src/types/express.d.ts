import type { Session, User } from "../types";

declare global {
  namespace Express {
    interface Request {
      authUser?: User;
      authSession?: Session;
    }
  }
}

export {};
