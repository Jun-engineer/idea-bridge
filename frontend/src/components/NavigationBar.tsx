import { useEffect, useMemo, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { listDevelopers, listIdeaCreators } from "../api/profiles";
import { useAuth } from "../context/AuthContext";
import type { DeveloperProfile, IdeaCreatorProfile } from "../types/models";
import "./NavigationBar.css";

export function NavigationBar() {
  const [developers, setDevelopers] = useState<DeveloperProfile[]>([]);
  const [creators, setCreators] = useState<IdeaCreatorProfile[]>([]);
  const [developerId, setDeveloperId] = useState<string>("");
  const [creatorId, setCreatorId] = useState<string>("");
  const { user, loading } = useAuth();

  useEffect(() => {
    let active = true;

    if (!user) {
      setDevelopers([]);
      setCreators([]);
      return () => {
        active = false;
      };
    }

    Promise.all([listDevelopers(), listIdeaCreators()])
      .then(([developers, creators]) => {
        if (!active) return;
        setDevelopers(developers);
        setCreators(creators);
      })
      .catch((err) => {
        console.warn("Unable to refresh navigation profiles", err);
      });

    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    if (!developers.length) {
      setDeveloperId("");
      return;
    }

    if (!user) {
      setDeveloperId("");
      return;
    }

    const canActAsDeveloper = !user.preferredRole || user.preferredRole === "developer";
    setDeveloperId(canActAsDeveloper ? user.id : "");
  }, [developers, user]);

  useEffect(() => {
    if (!creators.length) {
      setCreatorId("");
      return;
    }

    if (!user) {
      setCreatorId("");
      return;
    }

    const canActAsCreator = !user.preferredRole || user.preferredRole === "idea-creator";
    setCreatorId(canActAsCreator ? user.id : "");
  }, [creators, user]);

  const developerHref = useMemo(() => (developerId ? `/profiles/developer/${developerId}` : "#"), [developerId]);
  const creatorHref = useMemo(() => (creatorId ? `/profiles/idea-creator/${creatorId}` : "#"), [creatorId]);

  return (
    <header className="navigation">
      <Link to="/" className="navigation__brand">
        IdeaBridge
      </Link>
      <nav className="navigation__menu">
        <NavLink to="/" end>
          Ideas
        </NavLink>
  <NavLink to="/ideas/new">Submit Idea</NavLink>
  <NavLink to="/apps/new">Submit App</NavLink>
  {user && developerId ? <NavLink to={developerHref}>Developer</NavLink> : null}
  {user && creatorId ? <NavLink to={creatorHref}>Idea Creator</NavLink> : null}
  {loading ? null : user ? (
          <NavLink to="/profile/settings">Account</NavLink>
        ) : (
          <>
            <NavLink to="/signin">Sign in</NavLink>
            <NavLink to="/signup" className="navigation__cta">
              Sign up
            </NavLink>
          </>
        )}
      </nav>
    </header>
  );
}
