import type { AppSubmission, Idea } from "../types";
import { apiRequest } from "./http";

interface IdeaListResponse {
  ideas: Idea[];
}

interface IdeaDetailResponse {
  idea: Idea;
  submissions: AppSubmission[];
}

interface CreateIdeaPayload {
  title: string;
  description: string;
  tags: string[];
  creatorId: string;
}

export async function listIdeas(): Promise<Idea[]> {
  const data = await apiRequest<IdeaListResponse>("/api/ideas");
  return data.ideas;
}

export async function getIdea(ideaId: string): Promise<IdeaDetailResponse> {
  return apiRequest<IdeaDetailResponse>(`/api/ideas/${ideaId}`);
}

export async function createIdea(payload: CreateIdeaPayload): Promise<Idea> {
  const data = await apiRequest<{ idea: Idea }>("/api/ideas", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data.idea;
}
