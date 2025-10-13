import type { AppSubmission, DeveloperProfile, Idea, IdeaCreatorProfile } from "./types";

const ideaCreator: IdeaCreatorProfile = {
  id: "creator-1",
  username: "john_doe",
  role: "idea-creator",
  bio: "Product designer exploring new app concepts.",
  ideas: [],
};

const developer: DeveloperProfile = {
  id: "dev-1",
  username: "dev_jane",
  role: "developer",
  bio: "Full-stack engineer building impactful products.",
  portfolioUrl: "https://janedev.dev",
  apps: [],
  totalLikes: 56,
};

export const mockIdeas: Idea[] = [];

export const mockSubmissions: AppSubmission[] = [];

ideaCreator.ideas = mockIdeas;
developer.apps = mockSubmissions;

export const mockIdeaCreators = [ideaCreator];
export const mockDevelopers = [developer];
