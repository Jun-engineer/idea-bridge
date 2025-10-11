import type { AppSubmission } from "../types";
import { apiRequest } from "./http";

interface AppListResponse {
  submissions: AppSubmission[];
}

interface CreateAppPayload {
  ideaId: string;
  title: string;
  description: string;
  url: string;
  developerId: string;
}

export async function listAppSubmissions(): Promise<AppSubmission[]> {
  const data = await apiRequest<AppListResponse>("/api/apps");
  return data.submissions;
}

export async function createAppSubmission(payload: CreateAppPayload): Promise<AppSubmission> {
  const data = await apiRequest<{ submission: AppSubmission }>("/api/apps", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data.submission;
}
