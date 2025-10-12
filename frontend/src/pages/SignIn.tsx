import { useState, type FormEvent } from "react";
import { useNavigate, Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function SignInPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const result = await login(email, password);
      if (result.status === "authenticated") {
        navigate("/");
      } else {
        navigate(`/verify?request=${encodeURIComponent(result.verification.requestId)}`, {
          replace: true,
          state: { verification: result.verification },
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to sign in";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="page page--narrow">
      <header className="page__header">
        <h1>Welcome back</h1>
        <p>Sign in to continue collaborating on IdeaBridge.</p>
        {error ? <p className="helper helper--error">{error}</p> : null}
      </header>
      <form className="form" onSubmit={handleSubmit}>
        <label>
          Email
          <input type="email" name="email" autoComplete="email" required disabled={submitting} />
        </label>
        <label>
          Password
          <div className="form__password-field">
            <input
              className="form__password-input"
              type={showPassword ? "text" : "password"}
              name="password"
              autoComplete="current-password"
              required
              disabled={submitting}
            />
            <button
              className="form__password-toggle"
              type="button"
              onClick={() => setShowPassword((previous) => !previous)}
              aria-pressed={showPassword}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </label>
        <button className="button" type="submit" disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="helper">
        New to IdeaBridge? <Link to="/signup">Create an account</Link>.
      </p>
    </section>
  );
}
