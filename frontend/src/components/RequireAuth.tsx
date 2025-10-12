import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface RequireAuthProps {
  children: ReactNode;
  redirectTo?: string;
  pendingFallback?: ReactNode;
}

export function RequireAuth({
  children,
  redirectTo = "/signin",
  pendingFallback = (
    <section className="page page--centered">
      <p>Loading account…</p>
    </section>
  ),
}: RequireAuthProps) {
  const location = useLocation();
  const { user, loading } = useAuth();

  if (loading) {
    return <>{pendingFallback}</>;
  }

  if (!user) {
    const targetState = {
      from: `${location.pathname}${location.search}${location.hash}`,
    };
    return <Navigate to={redirectTo} replace state={targetState} />;
  }

  return <>{children}</>;
}
