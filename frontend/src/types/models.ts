export type UserRole = "idea-creator" | "developer";

export interface Idea {
  id: string;
  title: string;
  description: string;
  tags: string[];
  createdAt: string;
  creator: UserProfileSummary;
  likes: number;
  bookmarked?: boolean;
}

export interface AppSubmission {
  id: string;
  ideaId: string;
  title: string;
  description: string;
  url: string;
  screenshots?: string[];
  developer: UserProfileSummary;
  submittedAt: string;
  likeCount: number;
}

export interface UserProfileSummary {
  id: string;
  username: string;
  role: UserRole;
  bio?: string;
  avatarUrl?: string;
}

export interface IdeaCreatorProfile extends UserProfileSummary {
  role: "idea-creator";
  bio?: string;
  ideas: Idea[];
}

export interface DeveloperProfile extends UserProfileSummary {
  role: "developer";
  bio?: string;
  portfolioUrl?: string;
  apps: AppSubmission[];
  totalLikes?: number;
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

export type VerificationMethod = "phone";

export interface VerificationChallenge {
  requestId: string;
  method: VerificationMethod;
  maskedDestination: string;
  expiresAt: string;
  resendAvailableAt: string;
  attemptsRemaining: number;
}

export type AuthResult =
  | { status: "authenticated"; user: AuthUser }
  | { status: "verification_required"; verification: VerificationChallenge };
