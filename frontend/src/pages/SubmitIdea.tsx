import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { createIdea } from "../api/ideas";
import { listIdeaCreators } from "../api/profiles";
import { useAuth } from "../context/AuthContext";
import type { IdeaCreatorProfile } from "../types/models";

function parseTags(raw: FormDataEntryValue | null) {
  if (!raw) return [] as string[];
  return String(raw)
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function SubmitIdeaPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [creators, setCreators] = useState<IdeaCreatorProfile[]>([]);
  const [loadingCreators, setLoadingCreators] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCreatorId, setSelectedCreatorId] = useState("");

  const canCreateIdeas = useMemo(() => {
    if (!user) return false;
    return !user.preferredRole || user.preferredRole === "idea-creator";
  }, [user]);

  useEffect(() => {
    let active = true;
    setLoadingCreators(true);

    listIdeaCreators()
      .then((data) => {
        if (!active) return;
        let nextCreators = data;
        if (user) {
          if (!canCreateIdeas) {
            nextCreators = [];
          } else {
            nextCreators = data.filter((creator) => creator.id === user.id);
            if (nextCreators.length === 0) {
              nextCreators = [
                {
                  id: user.id,
                  username: user.displayName,
                  role: "idea-creator",
                  bio: user.bio ?? undefined,
                  ideas: [],
                },
              ];
            }
          }
        }
        setCreators(nextCreators);
        const defaultId = user && canCreateIdeas ? user.id : nextCreators[0]?.id ?? "";
        setSelectedCreatorId(defaultId);
      })
      .catch((err) => {
        if (!active) return;
        console.error("Failed to load idea creators", err);
        setError((err as Error).message);
      })
      .finally(() => {
        if (active) {
          setLoadingCreators(false);
        }
      });

    return () => {
      active = false;
    };
  }, [user, canCreateIdeas]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!canCreateIdeas || !selectedCreatorId) {
      setError("You need an idea creator profile to submit.");
      return;
    }

    setSubmitting(true);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const creatorId = selectedCreatorId;

    try {
      const idea = await createIdea({
        title: String(formData.get("title") ?? ""),
        description: String(formData.get("description") ?? ""),
        tags: parseTags(formData.get("tags")),
        creatorId,
      });

      form.reset();
      setSelectedCreatorId(user?.id ?? "");
      navigate(`/ideas/${idea.id}`);
    } catch (err) {
      console.error("Idea submission failed", err);
      setError((err as Error).message ?? "Unable to submit idea");
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <section className="page page--centered">
        <div className="stack">
          <h1>Sign in to share ideas</h1>
          <p className="helper">Create an account with the idea creator role to submit new concepts.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="page page--narrow">
      <header className="page__header">
        <h1>Share a new idea</h1>
        <p>Describe your app concept so developers can discover it.</p>
        {loadingCreators ? <p className="helper">Loading your profile…</p> : null}
        {error ? <p className="helper helper--error">{error}</p> : null}
        {!canCreateIdeas ? (
          <p className="helper helper--error">
            Your account is set to the developer role. Update your profile to submit ideas.
          </p>
        ) : null}
      </header>
      <form className="form" onSubmit={handleSubmit}>
        <label>
          Title
          <input type="text" name="title" placeholder="Summarize your idea" required disabled={submitting || !canCreateIdeas} />
        </label>
        <label>
          Description
          <textarea
            name="description"
            rows={6}
            placeholder="Explain the problem and solution"
            required
            disabled={submitting || !canCreateIdeas}
          />
        </label>
        <label>
          Tags
          <input type="text" name="tags" placeholder="e.g. productivity, fintech" disabled={submitting || !canCreateIdeas} />
        </label>
        <label>
          Idea creator profile
          <select
            name="creatorId"
            value={selectedCreatorId}
            onChange={(event) => setSelectedCreatorId(event.target.value)}
            required
            disabled={submitting || !canCreateIdeas}
          >
            <option value="" disabled>
              Select your profile
            </option>
            {creators.map((creator) => (
              <option key={creator.id} value={creator.id}>
                {creator.username}
              </option>
            ))}
          </select>
        </label>
        <button className="button" type="submit" disabled={submitting || !canCreateIdeas || creators.length === 0}>
          {submitting ? "Submitting…" : "Submit idea"}
        </button>
      </form>
    </section>
  );
}
