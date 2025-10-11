export type UserRole = "idea-creator" | "developer";

export interface UserProfileSummary {
  id: string;
  username: string;
  role: UserRole;
  bio?: string;
  avatarUrl?: string;
}

export interface Idea {
  id: string;
  title: string;
  description: string;
  tags: string[];
  createdAt: string;
  likes: number;
  bookmarked?: boolean;
  creator: UserProfileSummary;
}

export interface AppSubmission {
  id: string;
  ideaId: string;
  title: string;
  description: string;
  url: string;
  developer: UserProfileSummary;
  submittedAt: string;
  likeCount: number;
  screenshots?: string[];
}

export interface IdeaCreatorProfile extends UserProfileSummary {
  role: "idea-creator";
  ideas: Idea[];
}

export interface DeveloperProfile extends UserProfileSummary {
  role: "developer";
  portfolioUrl?: string;
  apps: AppSubmission[];
  totalLikes?: number;
}
