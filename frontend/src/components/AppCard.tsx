import type { AppSubmission } from "../types/models";
import "./AppCard.css";

interface AppCardProps {
  submission: AppSubmission;
}

export function AppCard({ submission }: AppCardProps) {
  return (
    <article className="app-card">
      <header className="app-card__header">
        <div>
          <h3>{submission.title}</h3>
          <p className="app-card__meta">
            by <span>{submission.developer.username}</span> · {new Date(submission.submittedAt).toLocaleDateString()}
          </p>
        </div>
        <div className="app-card__likes">❤ {submission.likeCount}</div>
      </header>
      <p className="app-card__description">{submission.description}</p>
      <a href={submission.url} target="_blank" rel="noreferrer" className="app-card__link">
        Visit project ↗
      </a>
    </article>
  );
}
