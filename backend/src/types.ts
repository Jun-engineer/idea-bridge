export type Role = "idea-creator" | "developer";

export interface UserProfileSummary {
  id: string;
  username: string;
  role: Role;
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
  screenshots?: string[];
  submittedAt: string;
  likeCount: number;
  developer: UserProfileSummary;
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

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  bio?: string;
  preferredRole?: Role;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  roleChangeEligibleAt: string;
  phoneNumber?: string;
  phoneVerified: boolean;
  pendingVerificationMethod: "phone" | null;
}

export interface Session {
  id: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}
