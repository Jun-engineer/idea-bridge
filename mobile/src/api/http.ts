import { resolveApiBaseUrl, getCachedApiBaseUrl } from "./baseUrl";

type ApiRequestOptions = RequestInit & {
  skipJson?: boolean;
  includeAuth?: boolean;
};

let accessToken: string | null = null;

export function setAuthToken(token: string | null) {
  accessToken = token;
}

export function getAuthToken() {
  return accessToken;
}

async function apiRequest<T = unknown>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { skipJson = false, includeAuth = true, headers: incomingHeaders, ...rest } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(incomingHeaders as Record<string, string> | undefined),
  };

  if (includeAuth && accessToken && !headers.Authorization) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const baseUrl = await resolveApiBaseUrl();
  const response = await fetch(`${baseUrl}${path}`, {
    ...rest,
    headers,
  });

  if (!response.ok) {
    let message: string | undefined;
    try {
      message = await response.text();
    } catch (err) {
      console.warn("Failed to parse error response", err);
    }
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  if (skipJson) {
    // @ts-expect-error explicit void return
    return undefined;
  }

  try {
    return (await response.json()) as T;
  } catch (err) {
    console.warn("Failed to parse JSON response", err);
    throw new Error("Unexpected response format");
  }
}

export { apiRequest, resolveApiBaseUrl, getCachedApiBaseUrl };
