import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import * as SecureStore from "expo-secure-store";

import type {
  AuthResult,
  AuthUser,
  UserRole,
  VerificationChallenge,
} from "../types";
import {
  confirmVerification,
  deleteAccount,
  fetchCurrentUser,
  fetchVerification,
  loginUser,
  logoutUser,
  registerUser,
  resendVerificationCode,
  startVerification,
  updateProfile,
} from "../api/auth";
import type { UpdateProfileResult } from "../api/auth";
import { setAuthToken } from "../api/http";
import { normalizePhoneNumber, sanitizePhoneNumberInput } from "../utils/phone";

const TOKEN_KEY = "ideaBridge.accessToken";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  pendingVerification: VerificationChallenge | null;
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (
    input: {
      email: string;
      password: string;
      displayName: string;
      bio?: string;
      preferredRole: UserRole;
      phoneNumber: string;
    },
  ) => Promise<AuthResult>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  update: (
    input: {
      displayName?: string;
      bio?: string | null;
      preferredRole?: UserRole | null;
      confirmRoleChange?: boolean;
      phoneNumber?: string | null;
    },
  ) => Promise<UpdateProfileResult>;
  deleteAccount: () => Promise<void>;
  confirmVerification: (input: { requestId: string; code: string }) => Promise<AuthResult>;
  resendVerification: (requestId: string) => Promise<VerificationChallenge>;
  loadVerification: (requestId: string) => Promise<VerificationChallenge>;
  startVerification: (input?: { phoneNumber?: string }) => Promise<AuthResult>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function persistToken(token: string | null) {
  setAuthToken(token);
  if (!token) {
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => undefined);
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingVerification, setPendingVerification] = useState<VerificationChallenge | null>(null);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
        if (!active) return;
        if (storedToken) {
          setAuthToken(storedToken);
          try {
            const current = await fetchCurrentUser();
            if (!active) return;
            if (current) {
              setUser(current);
            } else {
              await persistToken(null);
              if (!active) return;
              setUser(null);
            }
          } catch (err) {
            console.warn("Failed to restore user session", err);
            await persistToken(null);
            if (!active) return;
            setUser(null);
          }
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const handleAuthResult = useCallback(
    async (
      result: AuthResult,
      options?: { preserveUser?: boolean; preserveToken?: boolean },
    ) => {
      if (result.status === "authenticated") {
        if (!result.token) {
          console.warn("Authenticated response missing access token");
        }
        await persistToken(result.token ?? null);
        setUser(result.user);
        setPendingVerification(null);
      } else {
        if (!options?.preserveToken) {
          await persistToken(null);
        }
        setPendingVerification(result.verification);
        if (!options?.preserveUser) {
          setUser(null);
        }
      }
      return result;
    },
    [],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await loginUser({ email, password });
      return handleAuthResult(result);
    },
    [handleAuthResult],
  );

  const register = useCallback(
    async (input: {
      email: string;
      password: string;
      displayName: string;
      bio?: string;
      preferredRole: UserRole;
      phoneNumber: string;
    }) => {
      const result = await registerUser({
        ...input,
        email: input.email.trim(),
        displayName: input.displayName.trim(),
        bio: input.bio?.trim() ? input.bio.trim() : undefined,
        phoneNumber: normalizePhoneNumber(input.phoneNumber.trim()),
      });
      return handleAuthResult(result);
    },
    [handleAuthResult],
  );

  const logout = useCallback(async () => {
    try {
      await logoutUser();
    } finally {
      await persistToken(null);
      setUser(null);
      setPendingVerification(null);
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const current = await fetchCurrentUser();
      if (current) {
        setUser(current);
        setPendingVerification(null);
      } else {
        await persistToken(null);
        setUser(null);
      }
    } catch (err) {
      console.warn("Failed to refresh auth state", err);
      await persistToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const update = useCallback(
    async (input: {
      displayName?: string;
      bio?: string | null;
      preferredRole?: UserRole | null;
      confirmRoleChange?: boolean;
      phoneNumber?: string | null;
    }) => {
      const payload = { ...input } as typeof input & { phoneNumber?: string | null };
      if (Object.prototype.hasOwnProperty.call(input, "phoneNumber")) {
        payload.phoneNumber = sanitizePhoneNumberInput(input.phoneNumber) ?? null;
      }
      const result = await updateProfile(payload);
      setUser(result.user);
      if (result.verification) {
        setPendingVerification(result.verification);
      } else if (result.user.phoneVerified) {
        setPendingVerification(null);
      }
      return result;
    },
    [],
  );

  const removeAccount = useCallback(async () => {
    await deleteAccount();
    await persistToken(null);
    setUser(null);
    setPendingVerification(null);
  }, []);

  const confirm = useCallback(
    async (input: { requestId: string; code: string }) => {
      const result = await confirmVerification(input);
      return handleAuthResult(result);
    },
    [handleAuthResult],
  );

  const resend = useCallback(async (requestId: string) => {
    const verification = await resendVerificationCode({ requestId });
    setPendingVerification(verification);
    return verification;
  }, []);

  const load = useCallback(async (requestId: string) => {
    const verification = await fetchVerification(requestId);
    setPendingVerification(verification);
    return verification;
  }, []);

  const start = useCallback(
    async (input?: { phoneNumber?: string }) => {
      const result = await startVerification(input ?? {});
      return handleAuthResult(result, { preserveUser: true, preserveToken: true });
    },
    [handleAuthResult],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      pendingVerification,
      login,
      register,
      logout,
      refresh,
      update,
      deleteAccount: removeAccount,
      confirmVerification: confirm,
      resendVerification: resend,
      loadVerification: load,
      startVerification: start,
    }),
    [
      user,
      loading,
      pendingVerification,
      login,
      register,
      logout,
      refresh,
      update,
      removeAccount,
      confirm,
      resend,
      load,
      start,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
