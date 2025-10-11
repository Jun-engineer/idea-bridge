import type {
  AppSubmission,
  DeveloperProfile,
  Idea,
  IdeaCreatorProfile,
  UserProfileSummary,
} from "../types";

export const toProfileSummary = (profile: UserProfileSummary): UserProfileSummary => ({
  id: profile.id,
  username: profile.username,
  role: profile.role,
  bio: profile.bio,
  avatarUrl: profile.avatarUrl,
});

export const serializeIdea = (idea: Idea): Idea => ({
  ...idea,
  creator: toProfileSummary(idea.creator),
});

export const serializeAppSubmission = (submission: AppSubmission): AppSubmission => ({
  ...submission,
  developer: toProfileSummary(submission.developer),
});

export const serializeIdeaCreatorProfile = (profile: IdeaCreatorProfile): IdeaCreatorProfile => ({
  ...profile,
  ideas: profile.ideas.map(serializeIdea),
});

export const serializeDeveloperProfile = (profile: DeveloperProfile): DeveloperProfile => ({
  ...profile,
  apps: profile.apps.map(serializeAppSubmission),
});
