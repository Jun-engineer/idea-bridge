import type { AppSubmission, DeveloperProfile, Idea, IdeaCreatorProfile } from "./types";

const ideaCreator: IdeaCreatorProfile = {
  id: "creator-placeholder",
  username: "idea_creator",
  role: "idea-creator",
  bio: "",
  ideas: [],
};

const developer: DeveloperProfile = {
  id: "developer-placeholder",
  username: "developer_member",
  role: "developer",
  bio: "",
  portfolioUrl: "",
  apps: [],
  totalLikes: 0,
};

export const mockIdeas: Idea[] = [];

export const mockSubmissions: AppSubmission[] = [];

ideaCreator.ideas = mockIdeas;
developer.apps = mockSubmissions;

export const mockIdeaCreators = [ideaCreator];
export const mockDevelopers = [developer];
