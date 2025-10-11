import type { Request, Response } from "express";
import { Router } from "express";
import { z } from "zod";
import { db } from "../data/mockData";
import { listUsers } from "../data/userStore";
import type { Idea, Role, User, UserProfileSummary } from "../types";
import { serializeAppSubmission, serializeIdea, toProfileSummary } from "../utils/serialization";
import { requireAuth } from "../middleware/auth";
import { checkRateLimit } from "../utils/rateLimiter";
import { config } from "../config";

const createIdeaSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  tags: z.array(z.string()).default([]),
  creatorId: z.string(),
});

function userCanActAsRole(user: User, role: Role): boolean {
  if (user.deletedAt) return false;
  if (!user.preferredRole) return true;
  return user.preferredRole === role;
}

function userToIdeaCreatorSummary(user: User): UserProfileSummary {
  return {
    id: user.id,
    username: user.displayName,
    role: "idea-creator",
    bio: user.bio ?? undefined,
  };
}

const router = Router();
router.get("/", (_req: Request, res: Response) => {
  res.json({ ideas: db.ideas.map(serializeIdea) });
});

router.get("/:ideaId", (req: Request, res: Response) => {
  const idea = db.ideas.find((candidate) => candidate.id === req.params.ideaId);
  if (!idea) {
    return res.status(404).json({ message: "Idea not found" });
  }

  const submissions = db.appSubmissions
    .filter((submission) => submission.ideaId === idea.id)
    .map(serializeAppSubmission);
  return res.json({ idea: serializeIdea(idea), submissions });
});

router.post("/", requireAuth, async (req: Request, res: Response) => {
  const parseResult = createIdeaSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ errors: parseResult.error.flatten() });
  }

  const { title, description, tags, creatorId } = parseResult.data;
  if (req.authUser!.id !== creatorId) {
    return res.status(403).json({ message: "You can only submit ideas for your own profile" });
  }

  const rateResult = checkRateLimit(
    req.authUser!.id,
    "create-idea",
    config.ideaSubmissionLimit,
    config.submissionWindowSeconds * 1000,
  );
  if (!rateResult.allowed) {
    return res.status(429).json({
      message: "Idea submission limit reached. Try again later.",
      retryAfterSeconds: Math.ceil(rateResult.retryAfterMs / 1000),
    });
  }
  const users = await listUsers();
  const userCreator = users.find(
    (candidate) => candidate.id === creatorId && userCanActAsRole(candidate, "idea-creator"),
  );
  const creator = db.profiles.ideaCreators.find((profile) => profile.id === creatorId);

  if (!userCreator && !creator) {
    return res.status(404).json({ message: "Idea creator not found" });
  }

  const creatorSummary = userCreator ? userToIdeaCreatorSummary(userCreator) : toProfileSummary(creator!);

  const newIdea: Idea = {
    id: `idea-${Date.now()}`,
    title,
    description,
    tags,
    createdAt: new Date().toISOString(),
    likes: 0,
    creator: creatorSummary,
  };

  db.ideas.unshift(newIdea);
  if (creator) {
    creator.ideas.unshift({ ...newIdea });
  }

  return res.status(201).json({ idea: serializeIdea(newIdea) });
});

export const ideaRouter = router;
