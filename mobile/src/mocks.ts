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

export const mockIdeas: Idea[] = [
  {
    id: "idea-1",
    title: "Local Volunteer Match",
    description:
      "A marketplace where local non-profits publish short-term volunteer gigs and residents can join with one tap.",
    tags: ["community", "social-impact"],
    createdAt: "2025-10-01T12:00:00Z",
    likes: 74,
    creator: {
      id: ideaCreator.id,
      username: ideaCreator.username,
      role: ideaCreator.role,
    },
  },
  {
    id: "idea-2",
    title: "Mindful Commute Companion",
    description:
      "Guided audio routines and stretch reminders tailored to your morning commute duration and transport mode.",
    tags: ["wellness", "productivity"],
    createdAt: "2025-09-24T08:30:00Z",
    likes: 52,
    creator: {
      id: ideaCreator.id,
      username: ideaCreator.username,
      role: ideaCreator.role,
    },
  },
];

export const mockSubmissions: AppSubmission[] = [
  {
    id: "app-1",
    ideaId: "idea-1",
    title: "VolunteerNow",
    description: "MVP web app connecting volunteers with local events using Supabase backend.",
    url: "https://volunteernow.app",
    developer: {
      id: developer.id,
      username: developer.username,
      role: developer.role,
    },
    submittedAt: "2025-10-05T10:00:00Z",
    likeCount: 18,
  },
];

ideaCreator.ideas = mockIdeas;
developer.apps = mockSubmissions;

export const mockIdeaCreators = [ideaCreator];
export const mockDevelopers = [developer];
