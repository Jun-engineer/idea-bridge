import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getIdea } from "../api/ideas";
import { AppCard } from "../components/AppCard";
import { mockData } from "../data/mockData";
import type { AppSubmission, Idea } from "../types/models";

export function IdeaDetailPage() {
  const { ideaId } = useParams();
  const [idea, setIdea] = useState<Idea | null>(() =>
    mockData.ideas.find((candidate) => candidate.id === ideaId) ?? null
  );
  const [submissions, setSubmissions] = useState<AppSubmission[]>(() =>
    mockData.appSubmissions.filter((submission) => submission.ideaId === ideaId)
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ideaId) {
      return;
    }

    let active = true;
    setLoading(true);

    getIdea(ideaId)
      .then((data) => {
        if (!active) return;
        setIdea(data.idea);
        setSubmissions(data.submissions);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        console.error(`Failed to load idea ${ideaId}`, err);
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
  }, [ideaId]);

  if (!idea) {
    return (
      <section className="page page--padded">
        <h1>Idea not found</h1>
        <p>The idea you are looking for does not exist. Return to the ideas feed.</p>
        <Link to="/" className="link">
          Back to ideas
        </Link>
      </section>
    );
  }

  return (
    <section className="page page--padded">
      <Link to="/" className="link">
        ← Back to ideas
      </Link>
      <header className="page__header">
        <h1>{idea.title}</h1>
        <p>{idea.description}</p>
        <div className="tag-row">
          {idea.tags.map((tag) => (
            <span key={tag}>#{tag}</span>
          ))}
        </div>
        {loading ? <p className="helper">Refreshing idea details…</p> : null}
        {error ? <p className="helper">Showing cached data. ({error})</p> : null}
      </header>
      <section className="section">
        <div className="section__header">
          <h2>Submissions</h2>
          <Link to={`/apps/new?ideaId=${idea.id}`} className="button button--ghost">
            Submit an app
          </Link>
        </div>
        {submissions.length === 0 ? (
          <p>No submissions yet. Be the first to build this idea!</p>
        ) : (
          <div className="stack">
            {submissions.map((submission) => (
              <AppCard key={submission.id} submission={submission} />
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
