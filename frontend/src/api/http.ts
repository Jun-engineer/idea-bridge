const DEFAULT_BASE_URL = import.meta.env.DEV ? "http://localhost:4000" : "";

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL;
const API_BASE_URL = configuredBaseUrl && configuredBaseUrl.length > 0 ? configuredBaseUrl : DEFAULT_BASE_URL;

const AUTH_TOKEN_STORAGE_KEY = "ideaBridge:authToken";

let authToken: string | null = null;

function getBrowserStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function setInMemoryToken(token: string | null) {
  authToken = token;
}

export function initializeAuthTokenFromStorage(): string | null {
  const storage = getBrowserStorage();
  if (!storage) {
    return null;
  }
  const stored = storage.getItem(AUTH_TOKEN_STORAGE_KEY);
  setInMemoryToken(stored);
  return stored;
}

export function storeAuthToken(token: string | null) {
  setInMemoryToken(token);
  const storage = getBrowserStorage();
  if (!storage) {
    return;
  }
  if (token) {
    storage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  } else {
    storage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  }
}

export function getAuthToken(): string | null {
  return authToken;
}

interface RequestOptions extends RequestInit {
  skipJson?: boolean;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { skipJson, headers, ...rest } = options;
  const resolvedHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(headers as Record<string, string> | undefined),
  };

  const token = getAuthToken();
  if (token && !resolvedHeaders.Authorization) {
    resolvedHeaders.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: resolvedHeaders,
    ...rest,
  });

  if (!response.ok) {
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      let data: unknown = null;
      try {
        data = await response.json();
      } catch {
        /* ignore parse errors */
      }

      if (data && typeof data === "object") {
        const { message, error, detail } = data as {
          message?: unknown;
          error?: unknown;
          detail?: unknown;
        };
        const formatted = message ?? error ?? detail;
        if (formatted) {
          throw new Error(String(formatted));
        }
        throw new Error(JSON.stringify(data));
      }
    }

    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  if (skipJson) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export { API_BASE_URL };
