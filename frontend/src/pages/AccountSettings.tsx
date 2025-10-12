import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { normalizePhoneNumber, sanitizePhoneNumberInput } from "../utils/phone";
import { useAuth } from "../context/AuthContext";
import type { UserRole } from "../types/models";

export function AccountSettingsPage() {
  const {
    user,
    update,
    logout,
    deleteAccount,
    startVerification,
    pendingVerification,
  } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [preferredRole, setPreferredRole] = useState<UserRole | "">("");
  const [confirmRoleChange, setConfirmRoleChange] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName ?? "");
      setBio(user.bio ?? "");
      setPreferredRole(user.preferredRole ?? "");
      setConfirmRoleChange(false);
      setPhoneNumber(user.phoneNumber ?? "");
    }
  }, [user]);

  const navigate = useNavigate();
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const currentRoleSelection: UserRole | "" = user?.preferredRole ?? "";
  const roleChanged = preferredRole !== currentRoleSelection;
  const rawRoleChangeEligibleAt = user ? new Date(user.roleChangeEligibleAt) : null;
  const roleChangeLocked = rawRoleChangeEligibleAt ? rawRoleChangeEligibleAt.getTime() > Date.now() : false;

  useEffect(() => {
    if (!roleChanged) {
      setConfirmRoleChange(false);
    }
  }, [roleChanged]);

  if (!user) {
    return null;
  }

  const roleChangeEligibleAt = rawRoleChangeEligibleAt ?? new Date(user.roleChangeEligibleAt);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!displayName.trim()) {
      setError("Display name is required.");
      return;
    }

    if (roleChanged && roleChangeLocked) {
      setError(`Role changes unlock on ${roleChangeEligibleAt.toLocaleString()}.`);
      return;
    }

    if (roleChanged && !confirmRoleChange) {
      setError("Please confirm that you want to change your primary role.");
      return;
    }

    const previousPhone = user.phoneNumber ?? null;
    const nextPhone = sanitizePhoneNumberInput(phoneNumber);

    try {
      setSaving(true);
      setStatus(null);
      setError(null);
      setVerificationMessage(null);
      setVerificationError(null);
      const result = await update({
        displayName: displayName.trim(),
        bio: bio.trim().length > 0 ? bio.trim() : null,
        preferredRole: preferredRole || null,
        confirmRoleChange: roleChanged ? true : undefined,
        phoneNumber: nextPhone,
      });
      const updated = result.user;
      if (!isMountedRef.current) {
        return;
      }
      setStatus(`Profile saved successfully at ${new Date(updated.updatedAt).toLocaleTimeString()}`);
      setConfirmRoleChange(false);

      if (result.verification) {
        setVerificationMessage(`Code sent to ${result.verification.maskedDestination}.`);
        navigate(`/verify?request=${encodeURIComponent(result.verification.requestId)}`, {
          state: { verification: result.verification },
        });
        return;
      }

      const updatedPhone = updated.phoneNumber ?? null;
      const needsVerification =
        updated.pendingVerificationMethod === "phone" && !updated.phoneVerified && Boolean(updatedPhone);

      if (needsVerification && updatedPhone && updatedPhone !== previousPhone) {
        try {
          const verificationResult = await startVerification({ phoneNumber: normalizePhoneNumber(updatedPhone) });
          if (verificationResult.status === "verification_required") {
            setVerificationMessage(`Code sent to ${verificationResult.verification.maskedDestination}.`);
            navigate(`/verify?request=${encodeURIComponent(verificationResult.verification.requestId)}`, {
              state: { verification: verificationResult.verification },
            });
            return;
          }
          setVerificationMessage("Phone number already verified.");
        } catch (verificationErr) {
          const message =
            verificationErr instanceof Error ? verificationErr.message : "Unable to start verification";
          setVerificationError(message);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to save profile";
      if (!isMountedRef.current) {
        return;
      }
      setError(message);
    } finally {
      if (isMountedRef.current) {
        setSaving(false);
      }
    }
  };

  const handleLogout = async () => {
    try {
      setSigningOut(true);
      setStatus(null);
      setError(null);
      await logout();
      if (isMountedRef.current) {
        navigate("/", { replace: true });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to sign out";
      if (!isMountedRef.current) {
        return;
      }
      setError(message);
    } finally {
      if (isMountedRef.current) {
        setSigningOut(false);
      }
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm("Delete your account permanently? This cannot be undone.");
    if (!confirmed) return;

    try {
      setRemoving(true);
      setStatus(null);
      setError(null);
      await deleteAccount();
      if (isMountedRef.current) {
        navigate("/", { replace: true });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to delete account";
      if (!isMountedRef.current) {
        return;
      }
      setError(message);
    } finally {
      if (isMountedRef.current) {
        setRemoving(false);
      }
    }
  };

  const launchVerification = async () => {
    try {
      setVerificationError(null);
      setVerificationMessage("Sending verification code…");
      const candidate = phoneNumber.trim().length > 0 ? phoneNumber : user.phoneNumber ?? "";
      const sanitized = sanitizePhoneNumberInput(candidate);
      if (!sanitized) {
        setVerificationMessage(null);
        setVerificationError("Add a phone number above before requesting SMS verification.");
        return;
      }
  const result = await startVerification({ phoneNumber: sanitized });
      if (result.status === "authenticated") {
        setVerificationMessage("Already verified—no code required.");
        return;
      }
      setVerificationMessage(`Code sent to ${result.verification.maskedDestination}.`);
      navigate(`/verify?request=${encodeURIComponent(result.verification.requestId)}`, {
        state: { verification: result.verification },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to start verification";
      setVerificationError(message);
      setVerificationMessage(null);
    }
  };

  return (
    <section className="page page--narrow">
      <header className="page__header">
        <h1>Account settings</h1>
        <p>Update your profile details or manage your account access.</p>
        <p className="helper">Signed in as {user.email}</p>
        {status ? <p className="helper helper--success">{status}</p> : null}
        {error ? <p className="helper helper--error">{error}</p> : null}
        {verificationMessage ? <p className="helper helper--success">{verificationMessage}</p> : null}
        {verificationError ? <p className="helper helper--error">{verificationError}</p> : null}
      </header>

      <form className="form" onSubmit={handleSubmit}>
        <label>
          Display name
          <input
            name="displayName"
            type="text"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            disabled={saving || signingOut || removing}
            required
          />
        </label>
        <label>
          Bio <span className="helper">(optional)</span>
          <textarea
            name="bio"
            rows={4}
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            disabled={saving || signingOut || removing}
          />
        </label>
        <label>
          Phone number <span className="helper">(optional)</span>
          <input
            type="tel"
            name="phoneNumber"
            value={phoneNumber}
            onChange={(event) => setPhoneNumber(event.target.value)}
            placeholder="+1 555 555 1212"
            disabled={saving || signingOut || removing}
          />
          <span className="helper">Save changes before sending an SMS verification code.</span>
        </label>
        <label>
          Preferred role
          <select
            name="preferredRole"
            value={preferredRole}
            onChange={(event) => setPreferredRole((event.target.value as UserRole | "") ?? "")}
            disabled={saving || signingOut || removing || roleChangeLocked}
          >
            <option value="">Both roles</option>
            <option value="idea-creator">Idea creator</option>
            <option value="developer">Developer / builder</option>
          </select>
          {roleChangeLocked ? (
            <span className="helper helper--error">
              Role changes available after {roleChangeEligibleAt.toLocaleString()}.
            </span>
          ) : (
            <span className="helper">Switch roles to control which submissions you can make.</span>
          )}
        </label>
        {roleChanged ? (
          <label className="helper">
            <input
              type="checkbox"
              checked={confirmRoleChange}
              onChange={(event) => setConfirmRoleChange(event.target.checked)}
              disabled={saving || signingOut || removing || roleChangeLocked}
            />
            <span>I confirm I want to update my primary role.</span>
          </label>
        ) : null}
        <div className="stack">
          <button
            className="button"
            type="submit"
            disabled={saving || signingOut || removing}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>

      <section className="section">
        <div className="section__header">
          <h2>Verification</h2>
        </div>
        <div className="stack">
          <div>
            <h3>SMS</h3>
            <p className="helper">
              {user.phoneVerified ? "Verified" : user.phoneNumber ? "Not verified" : "No phone number on file"}
              {user.pendingVerificationMethod === "phone" || pendingVerification?.method === "phone"
                ? " • Verification pending"
                : ""}
            </p>
            <button
              className="button button--secondary"
              type="button"
              onClick={() => void launchVerification()}
              disabled={saving || signingOut || removing || (!user.phoneNumber && phoneNumber.trim().length === 0)}
            >
              {user.phoneVerified ? "Re-send SMS code" : "Send SMS code"}
            </button>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section__header">
          <h2>Session</h2>
        </div>
        <p className="helper">Sign out of IdeaBridge on this device.</p>
        <button className="button button--ghost" type="button" onClick={handleLogout} disabled={signingOut || removing || saving}>
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      </section>

      <section className="section">
        <div className="section__header">
          <h2>Danger zone</h2>
        </div>
        <p className="helper">Deleting your account removes your profile and sessions immediately.</p>
        <button className="button button--danger" type="button" onClick={handleDelete} disabled={removing || signingOut || saving}>
          {removing ? "Deleting…" : "Delete account"}
        </button>
      </section>
    </section>
  );
}
