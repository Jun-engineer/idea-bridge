import type { Request, Response } from "express";
import { Router } from "express";
import { z } from "zod";
import { db } from "../data/mockData";
import { listUsers } from "../data/userStore";
import type { AppSubmission, Role, User, UserProfileSummary } from "../types";
import { serializeAppSubmission, toProfileSummary } from "../utils/serialization";
import { requireAuth } from "../middleware/auth";
import { checkRateLimit } from "../utils/rateLimiter";
import { config } from "../config";

const createSubmissionSchema = z.object({
  ideaId: z.string(),
  title: z.string().min(3),
  description: z.string().min(10),
  url: z.string().url(),
  developerId: z.string(),
});

function userCanActAsRole(user: User, role: Role): boolean {
  if (user.deletedAt) return false;
  if (!user.preferredRole) return true;
  return user.preferredRole === role;
}

function userToDeveloperSummary(user: User): UserProfileSummary {
  return {
    id: user.id,
    username: user.displayName,
    role: "developer",
    bio: user.bio ?? undefined,
  };
}

const router = Router();

router.get("/", (_req: Request, res: Response) => {
  res.json({ submissions: db.appSubmissions.map(serializeAppSubmission) });
});

router.post("/", requireAuth, (req: Request, res: Response) => {
  const parseResult = createSubmissionSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ errors: parseResult.error.flatten() });
  }

  const { ideaId, title, description, url, developerId } = parseResult.data;
  if (req.authUser!.id !== developerId) {
    return res.status(403).json({ message: "You can only submit apps from your own profile" });
  }

  const rateResult = checkRateLimit(
    req.authUser!.id,
    "create-app",
    config.appSubmissionLimit,
    config.submissionWindowSeconds * 1000,
  );
  if (!rateResult.allowed) {
    return res.status(429).json({
      message: "App submission limit reached. Try again later.",
      retryAfterSeconds: Math.ceil(rateResult.retryAfterMs / 1000),
    });
  }
  const idea = db.ideas.find((candidate) => candidate.id === ideaId);
  if (!idea) {
    return res.status(404).json({ message: "Idea not found" });
  }

  const users = listUsers();
  const userDeveloper = users.find((candidate) => candidate.id === developerId && userCanActAsRole(candidate, "developer"));
  const developer = db.profiles.developers.find((profile) => profile.id === developerId);
  if (!userDeveloper && !developer) {
    return res.status(404).json({ message: "Developer profile not found" });
  }

  const developerSummary = userDeveloper ? userToDeveloperSummary(userDeveloper) : toProfileSummary(developer!);

  const newSubmission: AppSubmission = {
    id: `app-${Date.now()}`,
    ideaId,
    title,
    description,
    url,
    developer: developerSummary,
    submittedAt: new Date().toISOString(),
    likeCount: 0,
  };

  db.appSubmissions.unshift(newSubmission);
  if (developer) {
    developer.apps.unshift({ ...newSubmission });
  }

  return res.status(201).json({ submission: serializeAppSubmission(newSubmission) });
});

export const appRouter = router;
