import { useEffect, useMemo, useState } from "react";
import { listAppSubmissions } from "../api/apps";
import { listIdeas } from "../api/ideas";
import { IdeaCard } from "../components/IdeaCard";
import { mockData } from "../data/mockData";
import type { AppSubmission, Idea } from "../types/models";

export function HomePage() {
  const [ideas, setIdeas] = useState<Idea[]>(mockData.ideas);
  const [submissions, setSubmissions] = useState<AppSubmission[]>(mockData.appSubmissions);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [ideasResponse, submissionsResponse] = await Promise.all([listIdeas(), listAppSubmissions()]);
        if (!active) return;
        setIdeas(ideasResponse);
        setSubmissions(submissionsResponse);
        setError(null);
      } catch (err) {
        if (!active) return;
        console.error("Failed to load ideas", err);
        setError((err as Error).message);
        setIdeas(mockData.ideas);
        setSubmissions(mockData.appSubmissions);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  const submissionCountByIdea = useMemo(() => {
    const map = new Map<string, number>();
    for (const submission of submissions) {
      map.set(submission.ideaId, (map.get(submission.ideaId) ?? 0) + 1);
    }
    return map;
  }, [submissions]);

  return (
    <section className="page page--padded">
      <header className="page__header">
        <h1>Discover app ideas</h1>
        <p>Browse open ideas that developers can bring to life. Ideas stay open forever.</p>
        {loading ? <p className="helper">Syncing latest ideas…</p> : null}
        {error ? <p className="helper">Offline mode – showing sample data. ({error})</p> : null}
      </header>
      <div className="grid">
        {ideas.map((idea) => (
          <IdeaCard key={idea.id} idea={idea} appsCount={submissionCountByIdea.get(idea.id) ?? 0} />
        ))}
      </div>
    </section>
  );
}
