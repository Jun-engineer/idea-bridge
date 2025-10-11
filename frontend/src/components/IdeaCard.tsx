import { Link } from "react-router-dom";
import type { Idea } from "../types/models";
import "./IdeaCard.css";

interface IdeaCardProps {
  idea: Idea;
  appsCount?: number;
}

export function IdeaCard({ idea, appsCount = 0 }: IdeaCardProps) {
  return (
    <article className="idea-card">
      <header className="idea-card__header">
        <div>
          <h2>{idea.title}</h2>
          <p className="idea-card__meta">
            by <span>{idea.creator.username}</span> · {new Date(idea.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="idea-card__likes">❤ {idea.likes}</div>
      </header>
      <p className="idea-card__description">{idea.description}</p>
      <div className="idea-card__footer">
        <div className="idea-card__tags">
          {idea.tags.map((tag) => (
            <span key={tag}>#{tag}</span>
          ))}
        </div>
        <Link to={`/ideas/${idea.id}`} className="idea-card__cta">
          View idea · {appsCount} submissions
        </Link>
      </div>
    </article>
  );
}
