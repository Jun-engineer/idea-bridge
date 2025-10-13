import type {
  AppSubmission,
  DeveloperProfile,
  Idea,
  IdeaCreatorProfile,
  UserProfileSummary,
} from "../types";

const ideaCreatorProfile: IdeaCreatorProfile = {
  id: "creator-1",
  username: "john_doe",
  role: "idea-creator",
  bio: "Product designer exploring new app concepts.",
  ideas: [],
};

const developerProfile: DeveloperProfile = {
  id: "dev-1",
  username: "dev_jane",
  role: "developer",
  bio: "Full-stack engineer building impactful products.",
  portfolioUrl: "https://janedev.dev",
  apps: [],
  totalLikes: 56,
};

const ideaCreatorSummary: UserProfileSummary = {
  id: ideaCreatorProfile.id,
  username: ideaCreatorProfile.username,
  role: ideaCreatorProfile.role,
};

const developerSummary: UserProfileSummary = {
  id: developerProfile.id,
  username: developerProfile.username,
  role: developerProfile.role,
};

const ideas: Idea[] = [];

const appSubmissions: AppSubmission[] = [];

ideaCreatorProfile.ideas = [];
developerProfile.apps = [];

export const db = {
  ideas,
  appSubmissions,
  profiles: {
    ideaCreators: [ideaCreatorProfile],
    developers: [developerProfile],
  },
};
