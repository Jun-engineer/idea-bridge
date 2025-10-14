import Constants from "expo-constants";
import { Platform } from "react-native";

const DEFAULT_PORT = Number(process.env.EXPO_PUBLIC_API_PORT ?? 4000);
const HEALTH_PATH = "/health";
const PROBE_TIMEOUT_MS = Number(process.env.EXPO_PUBLIC_API_HEALTH_TIMEOUT_MS ?? 2500);
const ENABLE_LOGGING = process.env.EXPO_PUBLIC_API_LOGGING === "true";

let resolvedBaseUrl: string | null = null;
let resolvingPromise: Promise<string> | null = null;

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

function ensureProtocol(url: string): string {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  return `http://${url}`;
}

function dedupe(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (!value) continue;
    if (seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
}

function buildEnvCandidates(): string[] {
  const raw = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (!raw) {
    return [];
  }

  return raw
    .split(/[\s,]+/)
    .map((entry: string) => entry.trim())
    .filter(Boolean)
    .map(ensureProtocol)
    .map(stripTrailingSlash);
}

function guessHostFromDebugger(): string[] {
  const hosts: string[] = [];
  const debuggerHost =
    Constants.expoGoConfig?.debuggerHost ??
    Constants.expoConfig?.hostUri ??
    Constants.manifest2?.extra?.expoGo?.debuggerHost ??
    Constants.manifest2?.extra?.expoClient?.host ??
    Constants.manifest?.debuggerHost ??
    null;

  if (!debuggerHost) {
    return hosts;
  }

  const hostPart = debuggerHost.split("//").pop()?.split(":")[0];
  if (!hostPart) {
    return hosts;
  }

  if (hostPart === "localhost" || hostPart.startsWith("127.")) {
    if (Platform.OS === "android") {
      hosts.push(`http://10.0.2.2:${DEFAULT_PORT}`);
    } else {
      hosts.push(`http://localhost:${DEFAULT_PORT}`);
    }
    return hosts;
  }

  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostPart)) {
    hosts.push(`http://${hostPart}:${DEFAULT_PORT}`);
  }

  return hosts;
}

function buildPlatformDefaults(): string[] {
  if (Platform.OS === "android") {
    return [`http://10.0.2.2:${DEFAULT_PORT}`, "http://127.0.0.1:4000"];
  }

  if (Platform.OS === "ios") {
    return [`http://127.0.0.1:${DEFAULT_PORT}`, `http://localhost:${DEFAULT_PORT}`];
  }

  return [`http://localhost:${DEFAULT_PORT}`];
}

async function probeCandidate(baseUrl: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
    const response = await fetch(`${baseUrl}${HEALTH_PATH}`, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return response.ok;
  } catch (error) {
    return false;
  }
}

function buildCandidateList(): string[] {
  const DEFAULT_FALLBACK = `http://localhost:${DEFAULT_PORT}`;
  const candidates = dedupe([
    ...buildEnvCandidates(),
    ...guessHostFromDebugger(),
    ...buildPlatformDefaults(),
    DEFAULT_FALLBACK,
  ]);
  return candidates.map(stripTrailingSlash);
}

export function getCachedApiBaseUrl(): string | null {
  return resolvedBaseUrl;
}

async function chooseApiBaseUrl(): Promise<string> {
  const candidates = buildCandidateList();
  if (ENABLE_LOGGING) {
    console.log("[API] Probing backend hosts", candidates);
  }

  for (const candidate of candidates) {
    if (!candidate) continue;
    if (await probeCandidate(candidate)) {
      if (ENABLE_LOGGING) {
        console.log(`[API] Selected backend host ${candidate}`);
      }
      return candidate;
    }
  }

  const platformDefaults = buildPlatformDefaults();
  if (platformDefaults.length > 0) {
    const fallback = platformDefaults[0];
    if (ENABLE_LOGGING) {
      console.warn(
        `[API] Falling back to platform default ${fallback}. Set EXPO_PUBLIC_API_BASE_URL to avoid connectivity issues.`,
      );
    }
    return fallback;
  }

  if (ENABLE_LOGGING) {
    console.warn(
      `[API] Falling back to localhost because no backend hosts responded. Set EXPO_PUBLIC_API_BASE_URL to an accessible URL.`,
    );
  }

  return `http://localhost:${DEFAULT_PORT}`;
}

export async function resolveApiBaseUrl(forceRefresh = false): Promise<string> {
  if (!forceRefresh && resolvedBaseUrl) {
    return resolvedBaseUrl;
  }

  if (!resolvingPromise || forceRefresh) {
    resolvingPromise = (async () => {
      try {
        const selected = await chooseApiBaseUrl();
        resolvedBaseUrl = selected;
        return selected;
      } finally {
        resolvingPromise = null;
      }
    })();
  }

  return resolvingPromise;
}
