import type { AppSubmission } from "../types/models";
import { apiRequest } from "./http";

interface ListSubmissionsResponse {
  submissions: AppSubmission[];
}

interface CreateSubmissionPayload {
  ideaId: string;
  title: string;
  description: string;
  url: string;
  developerId: string;
}

export async function listAppSubmissions(): Promise<AppSubmission[]> {
  const data = await apiRequest<ListSubmissionsResponse>("/api/apps");
  return data.submissions;
}

export async function createAppSubmission(payload: CreateSubmissionPayload): Promise<AppSubmission> {
  const data = await apiRequest<{ submission: AppSubmission }>("/api/apps", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data.submission;
}
