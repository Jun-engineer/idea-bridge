import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { VerificationChallenge } from "../types/models";

function useCountdown(targetIso: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return useMemo(() => {
    if (!targetIso) return 0;
    return Math.max(0, Math.floor((new Date(targetIso).getTime() - now) / 1000));
  }, [targetIso, now]);
}

function useVerificationChallenge(requestId: string | null) {
  const { pendingVerification, loadVerification } = useAuth();
  const [challenge, setChallenge] = useState<VerificationChallenge | null>(() => {
    if (!requestId) return null;
    if (pendingVerification && pendingVerification.requestId === requestId) {
      return pendingVerification;
    }
    return null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!requestId) return;
    setLoading(true);
    try {
      const verification = await loadVerification(requestId);
      setChallenge(verification);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load verification challenge";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [loadVerification, requestId]);

  useEffect(() => {
    if (!requestId) return;
    if (challenge) return;
    void refresh();
  }, [challenge, refresh, requestId]);

  useEffect(() => {
    if (!pendingVerification || !requestId) return;
    if (pendingVerification.requestId !== requestId) return;
    setChallenge(pendingVerification);
  }, [pendingVerification, requestId]);

  return { challenge, loading, error, setError, setChallenge, refresh } as const;
}

export function VerifyContactPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, confirmVerification, resendVerification } = useAuth();
  const [searchParams] = useSearchParams();
  const requestFromQuery = searchParams.get("request");
  const requestFromState = (location.state as { verification?: VerificationChallenge } | null)?.verification;
  const requestId = requestFromState?.requestId ?? requestFromQuery;
  const { challenge, loading, error, setError, setChallenge, refresh } = useVerificationChallenge(
    requestId,
  );
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  const expiresIn = useCountdown(challenge?.expiresAt ?? null);
  const resendIn = useCountdown(challenge?.resendAvailableAt ?? null);

  useEffect(() => {
    if (requestFromState && requestFromState.requestId === requestId) {
      setChallenge(requestFromState);
    }
  }, [requestFromState, requestId, setChallenge]);

  if (!requestId) {
    return (
      <section className="page page--narrow">
        <header className="page__header">
          <h1>No verification request found</h1>
          <p>Please start from the sign-up or sign-in flow to receive a verification code.</p>
        </header>
      </section>
    );
  }

  if (user && (!challenge || challenge.requestId !== requestId)) {
    // User is already authenticated; no need to stay on this screen.
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!requestId) return;
    if (!code.trim()) {
      setError("Enter the verification code");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const result = await confirmVerification({ requestId, code: code.trim() });
      if (result.status === "authenticated") {
        navigate("/", { replace: true });
        return;
      }
      setChallenge(result.verification);
      setCode("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Verification failed";
      setError(message);
      await refresh();
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!requestId) return;
    try {
      setResending(true);
      setError(null);
      const updated = await resendVerification(requestId);
      setChallenge(updated);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to resend code";
      setError(message);
      await refresh();
    } finally {
      setResending(false);
    }
  };

  return (
    <section className="page page--narrow">
      <header className="page__header">
        <h1>Verify your account</h1>
        {challenge ? (
          <p>
            We sent a {challenge.method === "email" ? "verification email" : "text message"} to
            {" "}
            <strong>{challenge.maskedDestination}</strong>.
          </p>
        ) : (
          <p>Loading your verification challenge…</p>
        )}
        {error ? <p className="helper helper--error">{error}</p> : null}
      </header>
      <form className="form" onSubmit={handleSubmit}>
        <label>
          Verification code
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            name="code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="6-digit code"
            required
            disabled={submitting || loading || !challenge}
          />
        </label>
        <button className="button" type="submit" disabled={submitting || !challenge}>
          {submitting ? "Verifying…" : "Verify"}
        </button>
      </form>
      <div className="verification-meta">
        {challenge ? (
          <>
            <p className="helper">
              Expires in {expiresIn} seconds • Attempts remaining: {challenge.attemptsRemaining}
            </p>
            <button
              className="button button--secondary"
              type="button"
              onClick={handleResend}
              disabled={resending || resendIn > 0 || !challenge}
            >
              {resending
                ? "Sending…"
                : resendIn > 0
                  ? `Resend available in ${resendIn}s`
                  : "Resend code"}
            </button>
          </>
        ) : null}
      </div>
    </section>
  );
}
