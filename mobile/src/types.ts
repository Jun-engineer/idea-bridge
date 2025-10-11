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

export type VerificationMethod = "phone";

export interface VerificationChallenge {
  requestId: string;
  method: VerificationMethod;
  maskedDestination: string;
  expiresAt: string;
  resendAvailableAt: string;
  attemptsRemaining: number;
}

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  bio: string | null;
  preferredRole: UserRole | null;
  createdAt: string;
  updatedAt: string;
  roleChangeEligibleAt: string;
  phoneNumber: string | null;
  phoneVerified: boolean;
  pendingVerificationMethod: VerificationMethod | null;
}

export type AuthResult =
  | { status: "authenticated"; user: AuthUser; token: string | null }
  | { status: "verification_required"; verification: VerificationChallenge };
