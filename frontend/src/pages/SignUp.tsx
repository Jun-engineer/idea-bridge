import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { UserRole } from "../types/models";

export function SignUpPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const displayName = String(formData.get("displayName") ?? "").trim();
    const bio = String(formData.get("bio") ?? "").trim();
    const preferredRole = formData.get("preferredRole");

    if (!email || !password || !displayName || typeof preferredRole !== "string") {
      setError("Please complete all required fields.");
      return;
    }

    const normalizedRole = preferredRole as UserRole;

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const phoneNumber = String(formData.get("phoneNumber") ?? "").trim();
      if (!phoneNumber) {
        setError("Phone number is required for SMS verification.");
        return;
      }
      const result = await register({
        email,
        password,
        displayName,
        bio: bio.length > 0 ? bio : undefined,
        preferredRole: normalizedRole,
        phoneNumber,
      });
      if (result.status === "authenticated") {
        navigate("/");
        return;
      }
      navigate(`/verify?request=${encodeURIComponent(result.verification.requestId)}`, {
        replace: true,
        state: { verification: result.verification },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to create account";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="page page--narrow">
      <header className="page__header">
        <h1>Create your account</h1>
        <p>Join IdeaBridge to share ideas or launch your next build.</p>
        {error ? <p className="helper helper--error">{error}</p> : null}
      </header>
      <form className="form" onSubmit={handleSubmit}>
        <label>
          Display name
          <input type="text" name="displayName" placeholder="Taylor" required disabled={submitting} />
        </label>
        <label>
          Email
          <input type="email" name="email" autoComplete="email" required disabled={submitting} />
        </label>
        <label>
          Password
          <input type="password" name="password" autoComplete="new-password" required disabled={submitting} />
          <span className="helper">Use at least 8 characters.</span>
        </label>
        <label>
          Phone number
          <input
            type="tel"
            name="phoneNumber"
            placeholder="+1 555 555 1212"
            required
            disabled={submitting}
          />
          <span className="helper">We&apos;ll send your verification code via SMS.</span>
        </label>
        <label>
          Bio <span className="helper">(optional)</span>
          <textarea name="bio" rows={4} placeholder="Share a short intro" disabled={submitting} />
        </label>
        <label>
          Preferred role
          <select name="preferredRole" defaultValue="" required disabled={submitting}>
            <option value="" disabled>
              Select your primary role
            </option>
            <option value="idea-creator">Idea creator</option>
            <option value="developer">Developer / builder</option>
          </select>
          <span className="helper">You can request the other role later from account settings.</span>
        </label>
        <button className="button" type="submit" disabled={submitting}>
          {submitting ? "Creating account…" : "Sign up"}
        </button>
      </form>
      <p className="helper">
        Already have an account? <Link to="/signin">Sign in</Link>.
      </p>
    </section>
  );
}
