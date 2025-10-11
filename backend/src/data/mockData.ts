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

const ideas: Idea[] = [
  {
    id: "idea-1",
    title: "Local Volunteer Match",
    description:
      "A marketplace where local non-profits publish short-term volunteer gigs and residents can join with one tap.",
    tags: ["community", "social-impact"],
    createdAt: "2025-10-01T12:00:00Z",
    likes: 74,
    creator: ideaCreatorSummary,
    bookmarked: true,
  },
  {
    id: "idea-2",
    title: "Mindful Commute Companion",
    description:
      "Guided audio routines and stretch reminders tailored to your morning commute duration and transport mode.",
    tags: ["wellness", "productivity"],
    createdAt: "2025-09-24T08:30:00Z",
    likes: 52,
    creator: ideaCreatorSummary,
  },
];

const appSubmissions: AppSubmission[] = [
  {
    id: "app-1",
    ideaId: "idea-1",
    title: "VolunteerNow",
    description: "MVP web app connecting volunteers with local events using Supabase backend.",
    url: "https://volunteernow.app",
    developer: developerSummary,
    submittedAt: "2025-10-05T10:00:00Z",
    likeCount: 18,
  },
  {
    id: "app-2",
    ideaId: "idea-1",
    title: "NeighborAid",
    description: "React Native prototype with push notifications for urgent volunteer calls.",
    url: "https://github.com/devjane/neighboraid",
    developer: developerSummary,
    submittedAt: "2025-10-08T15:20:00Z",
    likeCount: 9,
  },
];

ideaCreatorProfile.ideas = ideas.map((idea) => ({ ...idea }));
developerProfile.apps = appSubmissions.map((submission) => ({ ...submission }));

export const db = {
  ideas,
  appSubmissions,
  profiles: {
    ideaCreators: [ideaCreatorProfile],
    developers: [developerProfile],
  },
};
