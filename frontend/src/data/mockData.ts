import type { AppSubmission, DeveloperProfile, Idea, IdeaCreatorProfile } from "../types/models";

const johnDoe: IdeaCreatorProfile = {
  id: "creator-1",
  username: "john_doe",
  role: "idea-creator",
  bio: "Product designer exploring new app concepts.",
  ideas: [],
};

const devJane: DeveloperProfile = {
  id: "dev-1",
  username: "dev_jane",
  role: "developer",
  bio: "Full-stack engineer building impactful products.",
  portfolioUrl: "https://janedev.dev",
  apps: [],
  totalLikes: 56,
};

const ideas: Idea[] = [];

const appSubmissions: AppSubmission[] = [];

johnDoe.ideas = ideas;
devJane.apps = appSubmissions;

export const mockData = {
  ideas,
  appSubmissions,
  profiles: {
    ideaCreators: [johnDoe],
    developers: [devJane],
  },
};
