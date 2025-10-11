import type { DeveloperProfile, IdeaCreatorProfile } from "../types";
import { apiRequest } from "./http";

interface DevelopersResponse {
  developers: DeveloperProfile[];
}

interface IdeaCreatorsResponse {
  ideaCreators: IdeaCreatorProfile[];
}

interface ProfileResponse<T> {
  profile: T;
}

export async function listDevelopers(): Promise<DeveloperProfile[]> {
  const data = await apiRequest<DevelopersResponse>("/api/profiles/developers");
  return data.developers;
}

export async function listIdeaCreators(): Promise<IdeaCreatorProfile[]> {
  const data = await apiRequest<IdeaCreatorsResponse>("/api/profiles/idea-creators");
  return data.ideaCreators;
}

export async function getDeveloperProfile(id: string): Promise<DeveloperProfile> {
  const data = await apiRequest<ProfileResponse<DeveloperProfile>>(`/api/profiles/developer/${id}`);
  return data.profile;
}

export async function getIdeaCreatorProfile(id: string): Promise<IdeaCreatorProfile> {
  const data = await apiRequest<ProfileResponse<IdeaCreatorProfile>>(`/api/profiles/idea-creator/${id}`);
  return data.profile;
}
