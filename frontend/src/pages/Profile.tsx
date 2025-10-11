import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { listAppSubmissions } from "../api/apps";
import { getDeveloperProfile, getIdeaCreatorProfile } from "../api/profiles";
import { AppCard } from "../components/AppCard";
import { IdeaCard } from "../components/IdeaCard";
import { useAuth } from "../context/AuthContext";
import type { DeveloperProfile, Idea, IdeaCreatorProfile } from "../types/models";

export function ProfilePage() {
  const { user } = useAuth();
  const { role, profileId } = useParams();
  const isDeveloper = role === "developer";

  if (!profileId) {
    return <NotFound label="Profile" />;
  }

  if (!user) {
    return (
      <section className="page page--centered">
        <div className="stack">
          <h1>Sign in to view profiles</h1>
          <p className="helper">Create an account or sign in to explore IdeaBridge members.</p>
        </div>
      </section>
    );
  }

  return isDeveloper ? (
    <DeveloperProfileView profileId={profileId} />
  ) : (
    <IdeaCreatorProfileView profileId={profileId} />
  );
}

function DeveloperProfileView({ profileId }: { profileId: string }) {
  const [profile, setProfile] = useState<DeveloperProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);

    getDeveloperProfile(profileId)
      .then((data) => {
        if (!active) return;
        setProfile(data);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        console.error(`Failed to load developer profile ${profileId}`, err);
        setError((err as Error).message);
        setProfile(null);
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [profileId]);

  const fallbackContent = useMemo(() => {
    if (loading) {
      return (
        <section className="page page--padded">
          <header className="page__header">
            <h1>Loading developer…</h1>
            <p className="helper">Hang tight while we fetch this profile.</p>
          </header>
        </section>
      );
    }
    if (!profile) {
      return <NotFound label="Developer" />;
    }
    return null;
  }, [loading, profile]);

  if (!profile) {
    return fallbackContent;
  }

  const totalLikes = profile.totalLikes ?? profile.apps.reduce((sum, app) => sum + app.likeCount, 0);

  return (
    <section className="page page--padded">
      <header className="page__header">
        <h1>{profile.username}</h1>
        <p>{profile.bio}</p>
        {profile.portfolioUrl ? (
          <a className="button" href={profile.portfolioUrl} target="_blank" rel="noreferrer">
            View portfolio
          </a>
        ) : null}
        {loading ? <p className="helper">Refreshing profile…</p> : null}
        {error ? <p className="helper helper--error">{error}</p> : null}
      </header>
      <section className="section">
        <div className="section__header">
          <h2>Apps submitted</h2>
          <p>Total likes · {totalLikes}</p>
        </div>
        <div className="stack">
          {profile.apps.map((submission) => (
            <AppCard key={submission.id} submission={submission} />
          ))}
        </div>
      </section>
    </section>
  );
}

function IdeaCreatorProfileView({ profileId }: { profileId: string }) {
  const [profile, setProfile] = useState<IdeaCreatorProfile | null>(null);
  const [submissionCounts, setSubmissionCounts] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.all([getIdeaCreatorProfile(profileId), listAppSubmissions()])
      .then(([profileResponse, submissions]) => {
        if (!active) return;
        setProfile(profileResponse);
        const map = new Map<string, number>();
        submissions.forEach((submission) => {
          map.set(submission.ideaId, (map.get(submission.ideaId) ?? 0) + 1);
        });
        setSubmissionCounts(map);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        console.error(`Failed to load idea creator profile ${profileId}`, err);
        setError((err as Error).message);
        setProfile(null);
        setSubmissionCounts(new Map());
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [profileId]);

  const fallbackContent = useMemo(() => {
    if (loading) {
      return (
        <section className="page page--padded">
          <header className="page__header">
            <h1>Loading creator…</h1>
            <p className="helper">Hang tight while we fetch this profile.</p>
          </header>
        </section>
      );
    }
    if (!profile) {
      return <NotFound label="Idea creator" />;
    }
    return null;
  }, [loading, profile]);

  if (!profile) {
    return fallbackContent;
  }

  return (
    <section className="page page--padded">
      <header className="page__header">
        <h1>{profile.username}</h1>
        <p>{profile.bio}</p>
        {loading ? <p className="helper">Refreshing ideas…</p> : null}
        {error ? <p className="helper helper--error">{error}</p> : null}
      </header>
      <section className="section">
        <div className="section__header">
          <h2>Ideas shared</h2>
          <p>Open ideas stay visible for developers forever.</p>
        </div>
        <div className="grid">
          {profile.ideas.map((idea: Idea) => (
            <IdeaCard key={idea.id} idea={idea} appsCount={submissionCounts.get(idea.id) ?? 0} />
          ))}
        </div>
      </section>
    </section>
  );
}

function NotFound({ label }: { label: string }) {
  return (
    <section className="page page--padded">
      <h1>{label} profile not found</h1>
      <p>Check the URL or return to the ideas feed.</p>
    </section>
  );
}
