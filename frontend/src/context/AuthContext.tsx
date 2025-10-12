import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type {
  AuthResult,
  AuthUser,
  UserRole,
  VerificationChallenge,
} from "../types/models";
import {
  deleteAccount,
  fetchCurrentUser,
  fetchVerification,
  confirmVerification,
  resendVerificationCode,
  startVerification as startVerificationRequest,
  loginUser,
  logoutUser,
  registerUser,
  updateProfile,
} from "../api/auth";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  pendingVerification: VerificationChallenge | null;
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (input: {
    email: string;
    password: string;
    displayName: string;
    bio?: string;
    preferredRole: UserRole;
    phoneNumber: string;
  }) => Promise<AuthResult>;
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
  ) => Promise<AuthUser>;
  deleteAccount: () => Promise<void>;
  confirmVerification: (input: { requestId: string; code: string }) => Promise<AuthResult>;
  resendVerification: (requestId: string) => Promise<VerificationChallenge>;
  loadVerification: (requestId: string) => Promise<VerificationChallenge>;
  startVerification: (input?: { phoneNumber?: string }) => Promise<AuthResult>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingVerification, setPendingVerification] = useState<VerificationChallenge | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const current = await fetchCurrentUser();
      setUser(current);
      setPendingVerification(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleAuthResult = useCallback((result: AuthResult, options?: { preserveUser?: boolean }) => {
    if (result.status === "authenticated") {
      setUser(result.user);
      setPendingVerification(null);
    } else {
      setPendingVerification(result.verification);
      if (!options?.preserveUser) {
        setUser(null);
      }
    }
    return result;
  }, []);

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
      const result = await registerUser(input);
      return handleAuthResult(result);
    },
    [handleAuthResult],
  );

  const logout = useCallback(async () => {
    await logoutUser();
    setUser(null);
    setPendingVerification(null);
  }, []);

  const update = useCallback(
    async (input: {
      displayName?: string;
      bio?: string | null;
      preferredRole?: UserRole | null;
      confirmRoleChange?: boolean;
      phoneNumber?: string | null;
    }) => {
      const updated = await updateProfile(input);
      setUser(updated);
      return updated;
    },
    [],
  );

  const removeAccount = useCallback(async () => {
    await deleteAccount();
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
      const result = await startVerificationRequest(input ?? {});
      return handleAuthResult(result, { preserveUser: true });
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
