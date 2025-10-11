import { useCallback, useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { useAuth } from "../context/AuthContext";
import type { RootStackParamList } from "../navigation/types";
import type { VerificationChallenge } from "../types";

interface VerifyContactScreenProps extends NativeStackScreenProps<RootStackParamList, "VerifyContact"> {}

function secondsUntil(targetIso: string | null): number {
  if (!targetIso) return 0;
  const diff = new Date(targetIso).getTime() - Date.now();
  return Math.max(0, Math.floor(diff / 1000));
}

const VerifyContactScreen = ({ route, navigation }: VerifyContactScreenProps) => {
  const { user, pendingVerification, confirmVerification, resendVerification, loadVerification } = useAuth();
  const { requestId: requestFromParams, verification: verificationFromParams } = route.params ?? {};
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [challenge, setChallenge] = useState<VerificationChallenge | null>(() => {
    if (verificationFromParams) return verificationFromParams;
    return pendingVerification;
  });
  const [expiresIn, setExpiresIn] = useState(() => secondsUntil(challenge?.expiresAt ?? null));
  const [resendIn, setResendIn] = useState(() => secondsUntil(challenge?.resendAvailableAt ?? null));

  const requestId = useMemo(() => {
    if (challenge) return challenge.requestId;
    if (verificationFromParams) return verificationFromParams.requestId;
    if (requestFromParams) return requestFromParams;
    if (pendingVerification) return pendingVerification.requestId;
    return null;
  }, [challenge, verificationFromParams, requestFromParams, pendingVerification]);

  useEffect(() => {
    if (pendingVerification && pendingVerification.requestId === requestId) {
      setChallenge(pendingVerification);
    }
  }, [pendingVerification, requestId]);

  useEffect(() => {
    setExpiresIn(secondsUntil(challenge?.expiresAt ?? null));
    setResendIn(secondsUntil(challenge?.resendAvailableAt ?? null));
  }, [challenge?.expiresAt, challenge?.resendAvailableAt]);

  useEffect(() => {
    const timer = setInterval(() => {
      setExpiresIn(secondsUntil(challenge?.expiresAt ?? null));
      setResendIn(secondsUntil(challenge?.resendAvailableAt ?? null));
    }, 1000);
    return () => clearInterval(timer);
  }, [challenge?.expiresAt, challenge?.resendAvailableAt]);

  useEffect(() => {
    if (user && !pendingVerification) {
      navigation.reset({ index: 0, routes: [{ name: "Home" }] });
    }
  }, [user, pendingVerification, navigation]);

  const refreshChallenge = useCallback(async () => {
    if (!requestId) return;
    setLoading(true);
    try {
      const next = await loadVerification(requestId);
      setChallenge(next);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load verification";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [requestId, loadVerification]);

  useEffect(() => {
    if (!requestId || challenge) {
      return;
    }
    void refreshChallenge();
  }, [requestId, challenge, refreshChallenge]);

  const handleSubmit = useCallback(async () => {
    if (!requestId) {
      setError("No verification request found.");
      return;
    }
    if (!code.trim()) {
      setError("Enter the verification code.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const result = await confirmVerification({ requestId, code: code.trim() });
      if (result.status === "verification_required") {
        setChallenge(result.verification);
        setCode("");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Verification failed";
      setError(message);
      await refreshChallenge();
    } finally {
      setSubmitting(false);
    }
  }, [requestId, code, confirmVerification, refreshChallenge]);

  const handleResend = useCallback(async () => {
    if (!requestId) return;
    try {
      setResending(true);
      setError(null);
      const updated = await resendVerification(requestId);
      setChallenge(updated);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to resend code";
      setError(message);
      await refreshChallenge();
    } finally {
      setResending(false);
    }
  }, [requestId, resendVerification, refreshChallenge]);

  if (!requestId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Verification not found</Text>
        <Text style={styles.body}>Return to sign in to request a new verification code.</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate("SignIn")}>
          <Text style={styles.primaryButtonText}>Back to sign in</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.select({ ios: "padding", android: undefined })}
      keyboardVerticalOffset={Platform.select({ ios: 80, android: 0 })}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Verify your account</Text>
          {challenge ? (
            <Text style={styles.body}>
              We sent a text message to <Text style={styles.strong}>{challenge.maskedDestination}</Text> with your code.
            </Text>
          ) : (
            <Text style={styles.body}>Loading your verification challenge…</Text>
          )}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Verification code</Text>
          <TextInput
            style={styles.input}
            placeholder="6-digit code"
            keyboardType="number-pad"
            value={code}
            onChangeText={setCode}
            editable={!submitting && !loading}
          />
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, (submitting || loading) && styles.disabled]}
          onPress={handleSubmit}
          disabled={submitting || loading}
        >
          <Text style={styles.primaryButtonText}>{submitting ? "Verifying…" : "Verify"}</Text>
        </TouchableOpacity>

        <View style={styles.metaRow}>
          <Text style={styles.helper}>
            Expires in {expiresIn}s • Attempts remaining: {challenge?.attemptsRemaining ?? "-"}
          </Text>
          <TouchableOpacity
            style={[styles.secondaryButton, (resending || resendIn > 0) && styles.disabled]}
            onPress={handleResend}
            disabled={resending || resendIn > 0}
          >
            <Text style={styles.secondaryButtonText}>
              {resending ? "Sending…" : resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  container: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#111827",
  },
  body: {
    marginTop: 8,
    fontSize: 14,
    color: "#374151",
  },
  strong: {
    fontWeight: "600",
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#d1d5db",
    fontSize: 15,
  },
  primaryButton: {
    backgroundColor: "#1f2937",
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 12,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "600",
  },
  secondaryButton: {
    marginTop: 16,
  },
  secondaryButtonText: {
    color: "#2563eb",
    fontWeight: "500",
  },
  metaRow: {
    marginTop: 24,
  },
  helper: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 12,
  },
  errorText: {
    marginTop: 12,
    color: "#b91c1c",
  },
  disabled: {
    opacity: 0.6,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#f9fafb",
  },
});

export default VerifyContactScreen;
