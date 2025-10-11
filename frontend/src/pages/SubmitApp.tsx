import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createAppSubmission } from "../api/apps";
import { listIdeas } from "../api/ideas";
import { listDevelopers } from "../api/profiles";
import { useAuth } from "../context/AuthContext";
import type { DeveloperProfile, Idea } from "../types/models";

function useIdeaIdFromQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search).get("ideaId") ?? "", [search]);
}

export function SubmitAppPage() {
  const ideaId = useIdeaIdFromQuery();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [developers, setDevelopers] = useState<DeveloperProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDeveloperId, setSelectedDeveloperId] = useState("");

  const canSubmitApps = useMemo(() => {
    if (!user) return false;
    return !user.preferredRole || user.preferredRole === "developer";
  }, [user]);

  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.all([listIdeas(), listDevelopers()])
      .then(([ideasResponse, developersResponse]) => {
        if (!active) return;
        setIdeas(ideasResponse);
        let nextDevelopers = developersResponse;
        if (user) {
          if (!canSubmitApps) {
            nextDevelopers = [];
          } else {
            nextDevelopers = developersResponse.filter((developer) => developer.id === user.id);
            if (nextDevelopers.length === 0) {
              nextDevelopers = [
                {
                  id: user.id,
                  username: user.displayName,
                  role: "developer",
                  bio: user.bio ?? undefined,
                  apps: [],
                  totalLikes: 0,
                },
              ];
            }
          }
        }
        setDevelopers(nextDevelopers);
        const defaultId = user && canSubmitApps ? user.id : nextDevelopers[0]?.id ?? "";
        setSelectedDeveloperId(defaultId);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        console.error("Failed to load submission dependencies", err);
        setError((err as Error).message);
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [user, canSubmitApps]);

  const selectedIdea = useMemo(() => ideas.find((idea) => idea.id === ideaId), [ideas, ideaId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!canSubmitApps || !selectedDeveloperId) {
      setError("You need a developer profile to submit an app.");
      return;
    }

    setSubmitting(true);

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const submission = await createAppSubmission({
        ideaId: String(formData.get("ideaId") ?? ""),
        title: String(formData.get("title") ?? ""),
        description: String(formData.get("description") ?? ""),
        url: String(formData.get("url") ?? ""),
        developerId: selectedDeveloperId,
      });

      form.reset();
      setSelectedDeveloperId(user?.id ?? "");
      navigate(`/ideas/${submission.ideaId}`);
    } catch (err) {
      console.error("App submission failed", err);
      setError((err as Error).message ?? "Unable to submit app");
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <section className="page page--centered">
        <div className="stack">
          <h1>Sign in to submit an app</h1>
          <p className="helper">Join as a developer to share your implementation.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="page page--narrow">
      <header className="page__header">
        <h1>Submit an app</h1>
        <p>
          Share your implementation so idea creators can explore what you built. Link to a live demo or repository.
        </p>
        {loading ? <p className="helper">Loading ideas and profiles…</p> : null}
        {error ? <p className="helper helper--error">{error}</p> : null}
        {!canSubmitApps ? (
          <p className="helper helper--error">
            Your account is set to the idea creator role. Update your profile to submit apps.
          </p>
        ) : null}
      </header>
      <form className="form" onSubmit={handleSubmit}>
        <label>
          Idea
          <select name="ideaId" defaultValue={ideaId} required disabled={submitting || !canSubmitApps}>
            <option value="" disabled>
              Select an idea
            </option>
            {ideas.map((idea) => (
              <option key={idea.id} value={idea.id}>
                {idea.title}
              </option>
            ))}
          </select>
        </label>
        {selectedIdea ? (
          <p className="helper">Responding to: {selectedIdea.title}</p>
        ) : null}
        <label>
          Developer profile
          <select
            name="developerId"
            value={selectedDeveloperId}
            onChange={(event) => setSelectedDeveloperId(event.target.value)}
            required
            disabled={submitting || !canSubmitApps}
          >
            <option value="" disabled>
              Select your profile
            </option>
            {developers.map((developer) => (
              <option key={developer.id} value={developer.id}>
                {developer.username}
              </option>
            ))}
          </select>
        </label>
        <label>
          App title
          <input type="text" name="title" placeholder="Give your app a name" required disabled={submitting || !canSubmitApps} />
        </label>
        <label>
          Description
          <textarea
            name="description"
            rows={5}
            placeholder="Explain what you built"
            required
            disabled={submitting || !canSubmitApps}
          />
        </label>
        <label>
          URL
          <input type="url" name="url" placeholder="https://..." required disabled={submitting || !canSubmitApps} />
        </label>
        <button
          className="button"
          type="submit"
          disabled={submitting || !canSubmitApps || ideas.length === 0 || developers.length === 0}
        >
          {submitting ? "Submitting…" : "Submit app"}
        </button>
      </form>
    </section>
  );
}
