import { useCallback, useState } from "react";
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

interface SignInScreenProps extends NativeStackScreenProps<RootStackParamList, "SignIn"> {}

const SignInScreen = ({ navigation }: SignInScreenProps) => {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const result = await login(email.trim(), password);
      if (result.status === "verification_required") {
        navigation.navigate("VerifyContact", {
          requestId: result.verification.requestId,
          verification: result.verification,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to sign in";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }, [email, password, login, navigation]);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.select({ ios: "padding", android: undefined })}
      keyboardVerticalOffset={Platform.select({ ios: 80, android: 0 })}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to continue collaborating on Idea Bridge.</Text>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            editable={!submitting}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordWrapper}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Your password"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              value={password}
              onChangeText={setPassword}
              editable={!submitting}
            />
            <TouchableOpacity
              style={styles.passwordToggle}
              onPress={() => setShowPassword((prev) => !prev)}
              disabled={submitting}
            >
              <Text style={styles.passwordToggleText}>{showPassword ? "Hide" : "Show"}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={[styles.primaryButton, submitting && styles.disabled]} onPress={handleSubmit} disabled={submitting}>
          <Text style={styles.primaryButtonText}>{submitting ? "Signing in…" : "Sign in"}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate("SignUp")}
        >
          <Text style={styles.secondaryButtonText}>New here? Create an account</Text>
        </TouchableOpacity>

        <View style={styles.helpRow}>
          <TouchableOpacity onPress={() => navigation.navigate("Instructions")}>
            <Text style={styles.helpLink}>How IdeaBridge works</Text>
          </TouchableOpacity>
          <Text style={styles.helpSeparator}>•</Text>
          <TouchableOpacity onPress={() => navigation.navigate("PrivacyPolicy")}>
            <Text style={styles.helpLink}>Privacy policy</Text>
          </TouchableOpacity>
          <Text style={styles.helpSeparator}>•</Text>
          <TouchableOpacity onPress={() => navigation.navigate("Support")}>
            <Text style={styles.helpLink}>Contact</Text>
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
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: "#6b7280",
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
  passwordWrapper: {
    position: "relative",
  },
  passwordInput: {
    paddingRight: 80,
  },
  passwordToggle: {
    position: "absolute",
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  passwordToggleText: {
    color: "#2563eb",
    fontWeight: "600",
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
    paddingVertical: 16,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#2563eb",
    fontWeight: "500",
  },
  errorText: {
    marginTop: 12,
    color: "#b91c1c",
  },
  disabled: {
    opacity: 0.7,
  },
  helpRow: {
    marginTop: 24,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  helpLink: {
    color: "#2563eb",
    fontWeight: "600",
  },
  helpSeparator: {
    color: "#9ca3af",
    fontWeight: "600",
  },
});

export default SignInScreen;
