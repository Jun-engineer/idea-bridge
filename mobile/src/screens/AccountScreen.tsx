import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
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
import {
  COUNTRY_DIAL_CODES,
  DEFAULT_COUNTRY_DIAL_CODE,
  composePhoneNumber,
  normalizePhoneNumber,
  splitPhoneNumber,
} from "../utils/phone";

interface AccountScreenProps extends NativeStackScreenProps<RootStackParamList, "AccountSettings"> {}

const roleOptions: Array<{ label: string; value: UserRole | "" }> = [
  { label: "Both roles", value: "" },
  { label: "Idea creator", value: "idea-creator" },
  { label: "Developer / builder", value: "developer" },
];

const AccountScreen = ({ navigation }: AccountScreenProps) => {
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
  const defaultCountryCode = useMemo(
    () =>
      COUNTRY_DIAL_CODES.find((entry) => entry.code === DEFAULT_COUNTRY_DIAL_CODE)?.code ??
      COUNTRY_DIAL_CODES[0].code,
    [],
  );
  const [countryCode, setCountryCode] = useState(defaultCountryCode);
  const [phoneLocal, setPhoneLocal] = useState("");
  const [preferredRole, setPreferredRole] = useState<UserRole | "">("");
  const [confirmRoleChange, setConfirmRoleChange] = useState(false);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => () => {
    isMountedRef.current = false;
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }
    setDisplayName(user.displayName ?? "");
    setBio(user.bio ?? "");
    const { countryCode: initialCode, nationalNumber } = splitPhoneNumber(user.phoneNumber);
    setCountryCode(initialCode);
    setPhoneLocal(nationalNumber);
    setPreferredRole(user.preferredRole ?? "");
    setConfirmRoleChange(false);
  }, [user]);

  const handlePhoneChange = useCallback((value: string) => {
    if (value.trim().startsWith("+")) {
      const normalized = normalizePhoneNumber(value);
      const parts = splitPhoneNumber(normalized);
      setCountryCode(parts.countryCode);
      setPhoneLocal(parts.nationalNumber);
      return;
    }
    setPhoneLocal(value);
  }, []);

  const roleChangeEligibleAt = useMemo(() => {
    if (!user) return null;
    return new Date(user.roleChangeEligibleAt);
  }, [user]);

  const roleChangeLocked = useMemo(() => {
    if (!roleChangeEligibleAt) return false;
    return roleChangeEligibleAt.getTime() > Date.now();
  }, [roleChangeEligibleAt]);

  const currentRole: UserRole | "" = user?.preferredRole ?? "";
  const roleChanged = preferredRole !== currentRole;

  const handleSave = useCallback(async () => {
    if (!user) {
      return;
    }
    const trimmedName = displayName.trim();
    if (!trimmedName) {
      setError("Display name is required.");
      return;
    }

    if (roleChanged && roleChangeLocked) {
      setError(
        roleChangeEligibleAt
          ? `Role changes unlock on ${roleChangeEligibleAt.toLocaleString()}.`
          : "Role change temporarily locked.",
      );
      return;
    }

    if (roleChanged && !confirmRoleChange) {
      setError("Please confirm that you want to change your primary role.");
      return;
    }

    const localCandidate = phoneLocal.trim();
    let nextPhone: string | null = null;

    if (localCandidate.length > 0) {
      try {
        const combined = composePhoneNumber(countryCode, localCandidate);
        nextPhone = combined;
        setPhoneLocal(combined.slice(countryCode.length));
      } catch (err) {
        const message = err instanceof Error ? err.message : "Enter a valid phone number";
        setError(message);
        return;
      }
    }

    try {
      setSaving(true);
      setStatus(null);
      setError(null);
      setVerificationMessage(null);
      setVerificationError(null);
      const result = await update({
        displayName: trimmedName,
        bio: bio.trim().length > 0 ? bio.trim() : null,
        preferredRole: preferredRole || null,
        confirmRoleChange: roleChanged ? true : undefined,
        phoneNumber: nextPhone,
      });

      if (!isMountedRef.current) {
        return;
      }

      const updated = result.user;
      setStatus(`Profile saved at ${new Date(updated.updatedAt).toLocaleTimeString()}`);
      setConfirmRoleChange(false);

      if (result.verification) {
        setVerificationMessage(`Code sent to ${result.verification.maskedDestination}.`);
        navigation.navigate("VerifyContact", {
          requestId: result.verification.requestId,
          verification: result.verification,
        });
        return;
      }

      if (updated.pendingVerificationMethod === "phone" && !updated.phoneVerified && updated.phoneNumber) {
        setVerificationMessage("Phone verification pending. Request a new code below.");
      } else if (updated.phoneVerified) {
        setVerificationMessage("Phone number verified.");
      }
    } catch (err) {
      if (!isMountedRef.current) {
        return;
      }
      const message = err instanceof Error ? err.message : "Unable to save profile";
      setError(message);
    } finally {
      if (isMountedRef.current) {
        setSaving(false);
      }
    }
  }, [
    bio,
    confirmRoleChange,
    countryCode,
    displayName,
    navigation,
    phoneLocal,
    preferredRole,
    roleChangeEligibleAt,
    roleChangeLocked,
    roleChanged,
    update,
    user,
  ]);

  const handleSendVerification = useCallback(async () => {
    if (!user) {
      return;
    }

    try {
      setVerificationError(null);
      setVerificationMessage("Sending verification code…");

      let sanitized: string | null = null;
      const trimmedLocal = phoneLocal.trim();

      if (trimmedLocal.length > 0) {
        try {
          const combined = composePhoneNumber(countryCode, trimmedLocal);
          sanitized = combined;
          setPhoneLocal(combined.slice(countryCode.length));
        } catch (err) {
          const message = err instanceof Error ? err.message : "Enter a valid phone number";
          setVerificationError(message);
          setVerificationMessage(null);
          return;
        }
      } else if (user.phoneNumber) {
        sanitized = user.phoneNumber;
      }

      if (!sanitized) {
        setVerificationError("Add a phone number above before requesting a code.");
        setVerificationMessage(null);
        return;
      }

      const result = await startVerification({ phoneNumber: sanitized });

      if (!isMountedRef.current) {
        return;
      }

      if (result.status === "verification_required") {
        setVerificationMessage(`Code sent to ${result.verification.maskedDestination}.`);
        navigation.navigate("VerifyContact", {
          requestId: result.verification.requestId,
          verification: result.verification,
        });
        return;
      }

      setVerificationMessage("Already verified—no code required.");
    } catch (err) {
      if (!isMountedRef.current) {
        return;
      }
      const message = err instanceof Error ? err.message : "Unable to start verification";
      setVerificationError(message);
      setVerificationMessage(null);
    }
  }, [countryCode, navigation, phoneLocal, startVerification, user]);

  const handleLogout = useCallback(async () => {
    try {
      setSigningOut(true);
      setStatus(null);
      setError(null);
      await logout();
    } catch (err) {
      if (!isMountedRef.current) {
        return;
      }
      const message = err instanceof Error ? err.message : "Unable to sign out";
      setError(message);
    } finally {
      if (isMountedRef.current) {
        setSigningOut(false);
      }
    }
  }, [logout]);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      "Delete account",
      "Delete your account permanently? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setRemoving(true);
              setStatus(null);
              setError(null);
              await deleteAccount();
            } catch (err) {
              if (!isMountedRef.current) {
                return;
              }
              const message = err instanceof Error ? err.message : "Unable to delete account";
              setError(message);
            } finally {
              if (isMountedRef.current) {
                setRemoving(false);
              }
            }
          },
        },
      ],
    );
  }, [deleteAccount]);

  if (!user) {
    return null;
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.select({ ios: "padding", android: undefined })}
      keyboardVerticalOffset={Platform.select({ ios: 80, android: 0 })}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Account settings</Text>
          <Text style={styles.subtitle}>Manage your profile details and account security.</Text>
          <Text style={styles.helper}>Signed in as {user.email}</Text>
          {status ? <Text style={[styles.helper, styles.helperSuccess]}>{status}</Text> : null}
          {error ? <Text style={[styles.helper, styles.helperError]}>{error}</Text> : null}
          {verificationMessage ? (
            <Text style={[styles.helper, styles.helperSuccess]}>{verificationMessage}</Text>
          ) : null}
          {verificationError ? (
            <Text style={[styles.helper, styles.helperError]}>{verificationError}</Text>
          ) : null}
          {pendingVerification?.method === "phone" ? (
            <Text style={[styles.helper, styles.helperWarning]}>
              Phone verification pending. Check your SMS messages for the latest code.
            </Text>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Display name</Text>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            editable={!saving && !signingOut && !removing}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Bio (optional)</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={bio}
            onChangeText={setBio}
            editable={!saving && !signingOut && !removing}
            multiline
            numberOfLines={4}
            placeholder="Share a short intro"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Phone number (optional)</Text>
          <View style={styles.phoneRow}>
            <View style={styles.countryPickerWrapper}>
              <Picker
                enabled={!saving && !signingOut && !removing}
                selectedValue={countryCode}
                onValueChange={(value) => setCountryCode(value as string)}
              >
                {COUNTRY_DIAL_CODES.map((entry) => (
                  <Picker.Item key={`${entry.code}-${entry.label}`} label={entry.label} value={entry.code} />
                ))}
              </Picker>
            </View>
            <TextInput
              style={[styles.input, styles.phoneInput]}
              placeholder="412 345 678"
              keyboardType="phone-pad"
              value={phoneLocal}
              onChangeText={handlePhoneChange}
              editable={!saving && !signingOut && !removing}
            />
          </View>
          <Text style={styles.helper}>Save changes before sending an SMS verification code.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Preferred role</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              enabled={!saving && !signingOut && !removing && !roleChangeLocked}
              selectedValue={preferredRole}
              onValueChange={(value) => setPreferredRole((value as UserRole | "") ?? "")}
            >
              {roleOptions.map((option) => (
                <Picker.Item key={option.label} label={option.label} value={option.value} />
              ))}
            </Picker>
          </View>
          {roleChangeLocked ? (
            <Text style={[styles.helper, styles.helperError]}>
              Role changes available after {roleChangeEligibleAt?.toLocaleString()}.
            </Text>
          ) : (
            <Text style={styles.helper}>Switch roles to control which submissions you can make.</Text>
          )}
        </View>

        {roleChanged ? (
          <View style={styles.sectionRow}>
            <Text style={styles.helper}>I confirm I want to update my primary role.</Text>
            <Switch
              value={confirmRoleChange}
              onValueChange={setConfirmRoleChange}
              disabled={saving || signingOut || removing || roleChangeLocked}
            />
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.primaryButton, (saving || signingOut || removing) && styles.disabledButton]}
          onPress={() => void handleSave()}
          disabled={saving || signingOut || removing}
        >
          <Text style={styles.primaryButtonText}>{saving ? "Saving…" : "Save changes"}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, (saving || signingOut || removing) && styles.disabledButton]}
          onPress={() => void handleSendVerification()}
          disabled={saving || signingOut || removing}
        >
          <Text style={styles.secondaryButtonText}>Send SMS code</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity
          style={[styles.secondaryButton, signingOut && styles.disabledButton]}
          onPress={() => void handleLogout()}
          disabled={signingOut || removing}
        >
          <Text style={styles.secondaryButtonText}>{signingOut ? "Signing out…" : "Sign out"}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.dangerButton, removing && styles.disabledButton]}
          onPress={handleDeleteAccount}
          disabled={removing || signingOut}
        >
          <Text style={styles.dangerButtonText}>{removing ? "Deleting…" : "Delete account"}</Text>
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
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 8,
  },
  helper: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 4,
  },
  helperSuccess: {
    color: "#047857",
  },
  helperError: {
    color: "#b91c1c",
  },
  helperWarning: {
    color: "#b45309",
  },
  section: {
    marginBottom: 18,
  },
  sectionRow: {
    marginBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
    minHeight: 110,
    textAlignVertical: "top",
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  countryPickerWrapper: {
    flex: 0.9,
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#ffffff",
  },
  phoneInput: {
    flex: 1,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#ffffff",
  },
  primaryButton: {
    backgroundColor: "#1f2937",
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 12,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "600",
  },
  secondaryButton: {
    backgroundColor: "#1118270d",
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 12,
  },
  secondaryButtonText: {
    color: "#1f2937",
    fontWeight: "600",
  },
  dangerButton: {
    backgroundColor: "#fee2e2",
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 12,
  },
  dangerButtonText: {
    color: "#b91c1c",
    fontWeight: "700",
  },
  divider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginVertical: 12,
  },
  disabledButton: {
    opacity: 0.7,
  },
});

export default AccountScreen;
