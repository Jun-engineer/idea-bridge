import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { useAuth } from "../context/AuthContext";
import type { RootStackParamList } from "../navigation/types";
import type { UserRole } from "../types";

interface SignUpScreenProps extends NativeStackScreenProps<RootStackParamList, "SignUp"> {}

const roleOptions: Array<{ label: string; value: UserRole }> = [
  { label: "Idea creator", value: "idea-creator" },
  { label: "Developer / builder", value: "developer" },
];

function normalizePhoneNumber(value: string): string {
  const digits = value.replace(/[^\d+]/g, "").replace(/^00/, "+");
  if (!digits.startsWith("+") && digits.length > 0) {
    return `+${digits}`;
  }
  return digits;
}

const SignUpScreen = ({ navigation }: SignUpScreenProps) => {
  const { register } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [bio, setBio] = useState("");
  const [preferredRole, setPreferredRole] = useState<UserRole | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roleItems = useMemo(() => roleOptions, []);

  const handleSubmit = useCallback(async () => {
    if (!displayName.trim() || !email.trim() || !password || !preferredRole || !phoneNumber.trim()) {
      setError("Please fill out all required fields.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const result = await register({
        email: email.trim(),
        password,
        displayName: displayName.trim(),
        bio: bio.trim() ? bio.trim() : undefined,
        preferredRole,
        phoneNumber: normalizePhoneNumber(phoneNumber.trim()),
      });

      if (result.status === "verification_required") {
        navigation.navigate("VerifyContact", {
          requestId: result.verification.requestId,
          verification: result.verification,
        });
      } else {
        Alert.alert("Welcome!", "Your account is ready.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to create account";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }, [displayName, email, password, preferredRole, phoneNumber, bio, register, navigation]);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.select({ ios: "padding", android: undefined })}
      keyboardVerticalOffset={Platform.select({ ios: 80, android: 0 })}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>Join Idea Bridge to share ideas or launch your next build.</Text>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Display name</Text>
          <TextInput
            style={styles.input}
            placeholder="Taylor"
            value={displayName}
            onChangeText={setDisplayName}
            editable={!submitting}
          />
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
          <TextInput
            style={styles.input}
            placeholder="Use at least 8 characters"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            editable={!submitting}
          />
          <Text style={styles.helper}>Use at least 8 characters.</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Phone number</Text>
          <TextInput
            style={styles.input}
            placeholder="+1 555 555 1212"
            keyboardType="phone-pad"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            editable={!submitting}
          />
          <Text style={styles.helper}>We&apos;ll send the verification code via SMS.</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Bio (optional)</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="Share a short intro"
            multiline
            numberOfLines={4}
            value={bio}
            onChangeText={setBio}
            editable={!submitting}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Preferred role</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              enabled={!submitting}
              selectedValue={preferredRole ?? ""}
              onValueChange={(value) => {
                if (!value) {
                  setPreferredRole(null);
                  return;
                }
                setPreferredRole(value as UserRole);
              }}
            >
              <Picker.Item label="Select your primary role" value="" key="placeholder" />
              {roleItems.map((item) => (
                <Picker.Item key={item.value} label={item.label} value={item.value} />
              ))}
            </Picker>
          </View>
          <Text style={styles.helper}>You can request the other role later from account settings.</Text>
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, submitting && styles.disabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={styles.primaryButtonText}>{submitting ? "Creating account…" : "Sign up"}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate("SignIn")}>
          <Text style={styles.secondaryButtonText}>Already have an account? Sign in</Text>
        </TouchableOpacity>
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
  multiline: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  helper: {
    marginTop: 6,
    fontSize: 12,
    color: "#6b7280",
  },
  pickerWrapper: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#d1d5db",
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
});

export default SignUpScreen;
