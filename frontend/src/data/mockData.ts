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

const ideas: Idea[] = [
  {
    id: "idea-1",
    title: "Local Volunteer Match",
    description:
      "A marketplace where local non-profits publish short-term volunteer gigs and residents can join with one tap.",
    tags: ["community", "social-impact"],
    createdAt: "2025-10-01T12:00:00Z",
    creator: johnDoe,
    likes: 74,
    bookmarked: true,
  },
  {
    id: "idea-2",
    title: "Mindful Commute Companion",
    description:
      "Guided audio routines and stretch reminders tailored to your morning commute duration and transport mode.",
    tags: ["wellness", "productivity"],
    createdAt: "2025-09-24T08:30:00Z",
    creator: johnDoe,
    likes: 52,
  },
];

const appSubmissions: AppSubmission[] = [
  {
    id: "app-1",
    ideaId: "idea-1",
    title: "VolunteerNow",
    description: "MVP web app connecting volunteers with local events using Supabase backend.",
    url: "https://volunteernow.app",
    developer: devJane,
    submittedAt: "2025-10-05T10:00:00Z",
    likeCount: 18,
  },
  {
    id: "app-2",
    ideaId: "idea-1",
    title: "NeighborAid",
    description: "React Native prototype with push notifications for urgent volunteer calls.",
    url: "https://github.com/devjane/neighboraid",
    developer: devJane,
    submittedAt: "2025-10-08T15:20:00Z",
    likeCount: 9,
  },
];

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
