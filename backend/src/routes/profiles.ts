import type { Request, Response } from "express";
import { Router } from "express";
import { db } from "../data/mockData";
import { listUsers } from "../data/userStore";
import type { DeveloperProfile, IdeaCreatorProfile, Role, User } from "../types";
import {
  serializeDeveloperProfile,
  serializeIdeaCreatorProfile,
  serializeAppSubmission,
  serializeIdea,
} from "../utils/serialization";

const router = Router();

function userCanActAsRole(user: User, role: Role): boolean {
  if (user.deletedAt) return false;
  if (!user.preferredRole) return true;
  return user.preferredRole === role;
}

function mapUserToDeveloperProfile(user: User): DeveloperProfile {
  const apps = db.appSubmissions
    .filter((submission) => submission.developer.id === user.id)
    .map((submission) => ({ ...submission }));
  return {
    id: user.id,
    username: user.displayName,
    role: "developer",
    bio: user.bio ?? undefined,
    apps,
    totalLikes: apps.reduce((sum, submission) => sum + submission.likeCount, 0),
  };
}

function mapUserToIdeaCreatorProfile(user: User): IdeaCreatorProfile {
  const ideas = db.ideas
    .filter((idea) => idea.creator.id === user.id)
    .map((idea) => ({ ...idea }));
  return {
    id: user.id,
    username: user.displayName,
    role: "idea-creator",
    bio: user.bio ?? undefined,
    ideas,
  };
}

router.get("/developers", async (_req: Request, res: Response) => {
  const users = await listUsers();
  const userDevelopers = users
    .filter((user) => userCanActAsRole(user, "developer"))
    .map((user) => serializeDeveloperProfile(mapUserToDeveloperProfile(user)));
  const developers = [
    ...userDevelopers,
    ...db.profiles.developers.map((profile) =>
      serializeDeveloperProfile({
        ...profile,
        apps: profile.apps.map((submission) => serializeAppSubmission(submission)),
      }),
    ),
  ];
  res.json({ developers });
});

router.get("/idea-creators", async (_req: Request, res: Response) => {
  const users = await listUsers();
  const userCreators = users
    .filter((user) => userCanActAsRole(user, "idea-creator"))
    .map((user) => serializeIdeaCreatorProfile(mapUserToIdeaCreatorProfile(user)));
  const ideaCreators = [
    ...userCreators,
    ...db.profiles.ideaCreators.map((profile) =>
      serializeIdeaCreatorProfile({
        ...profile,
        ideas: profile.ideas.map((idea) => serializeIdea(idea)),
      }),
    ),
  ];
  res.json({ ideaCreators });
});

router.get("/:role/:id", async (req: Request, res: Response) => {
  const { role, id } = req.params;
  const users = await listUsers();
  if (role === "developer") {
    const user = users.find(
      (candidate) => candidate.id === id && userCanActAsRole(candidate, "developer"),
    );
    if (user) {
      return res.json({ profile: serializeDeveloperProfile(mapUserToDeveloperProfile(user)) });
    }

    const profile = db.profiles.developers.find((developer) => developer.id === id);
    if (!profile) {
      return res.status(404).json({ message: "Developer profile not found" });
    }
    return res.json({
      profile: serializeDeveloperProfile({
        ...profile,
        apps: profile.apps.map((submission) => serializeAppSubmission(submission)),
      }),
    });
  }

  if (role === "idea-creator") {
    const user = users.find(
      (candidate) => candidate.id === id && userCanActAsRole(candidate, "idea-creator"),
    );
    if (user) {
      return res.json({ profile: serializeIdeaCreatorProfile(mapUserToIdeaCreatorProfile(user)) });
    }

    const profile = db.profiles.ideaCreators.find((creator) => creator.id === id);
    if (!profile) {
      return res.status(404).json({ message: "Idea creator profile not found" });
    }
    return res.json({
      profile: serializeIdeaCreatorProfile({
        ...profile,
        ideas: profile.ideas.map((idea) => serializeIdea(idea)),
      }),
    });
  }

  return res.status(400).json({ message: "Unsupported profile role" });
});

export const profileRouter = router;
