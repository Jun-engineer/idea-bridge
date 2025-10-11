const DEFAULT_BASE_URL = "http://localhost:4000";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? DEFAULT_BASE_URL;

interface RequestOptions extends RequestInit {
  skipJson?: boolean;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { skipJson, headers, ...rest } = options;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
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
