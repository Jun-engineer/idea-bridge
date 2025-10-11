const DEFAULT_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

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

  const response = await fetch(`${DEFAULT_BASE_URL}${path}`, {
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

export { DEFAULT_BASE_URL, apiRequest };
