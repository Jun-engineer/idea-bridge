import { useCallback, useEffect, useMemo, useState } from "react";
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

import { createIdea } from "../api/ideas";
import { listIdeaCreators } from "../api/profiles";
import type { IdeaCreatorProfile } from "../types";
import { mockIdeaCreators } from "../mocks";
import type { RootStackParamList } from "../navigation/types";
import { useAuth } from "../context/AuthContext";

interface SubmitIdeaScreenProps extends NativeStackScreenProps<RootStackParamList, "SubmitIdea"> {}

const SubmitIdeaScreen = ({ navigation }: SubmitIdeaScreenProps) => {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [creatorId, setCreatorId] = useState<string | undefined>(undefined);
  const [creators, setCreators] = useState<IdeaCreatorProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCreators = useCallback(async () => {
    if (!user) {
      setCreators([]);
      setCreatorId(undefined);
      setError("Sign in to load your idea creator profile.");
      setLoadingProfiles(false);
      return;
    }

    try {
      setError(null);
      const data = await listIdeaCreators();
      const matchingProfiles = data.filter((profile) => profile.id === user.id);
      const nextCreators = matchingProfiles.length > 0 ? matchingProfiles : data;
      setCreators(nextCreators);
      setCreatorId(user.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load idea creators";
      setError(message);
      setCreators(mockIdeaCreators);
      if (!creatorId && mockIdeaCreators.length > 0) {
        setCreatorId(mockIdeaCreators[0].id);
      }
    } finally {
      setLoadingProfiles(false);
    }
  }, [creatorId, user]);

  useEffect(() => {
    void loadCreators();
  }, [loadCreators]);

  const tags = useMemo(
    () =>
      tagsText
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    [tagsText],
  );

  const handleSubmit = useCallback(async () => {
    if (!user) {
      Alert.alert("Sign in required", "Create an account to submit ideas.");
      return;
    }

    if (!creatorId) {
      Alert.alert("Choose creator", "Select an idea creator profile to submit under.");
      return;
    }

    if (!title || !description) {
      Alert.alert("Missing fields", "Please fill in the title and description.");
      return;
    }

    try {
      setSubmitting(true);
      const idea = await createIdea({
        title,
        description,
        tags,
        creatorId: user.id,
      });

      Alert.alert("Success", "Idea submitted successfully!", [
        {
          text: "View idea",
          onPress: () => navigation.replace("IdeaDetail", { ideaId: idea.id }),
        },
      ]);
      setTitle("");
      setDescription("");
      setTagsText("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to submit idea";
      Alert.alert("Submission failed", message);
    } finally {
      setSubmitting(false);
    }
  }, [creatorId, description, navigation, tags, title]);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.select({ ios: "padding", android: undefined })}
      keyboardVerticalOffset={Platform.select({ ios: 100, android: 0 })}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.heading}>Share a new idea</Text>
        <Text style={styles.subheading}>
          Fill in the details below to inspire builders in the Idea Bridge community.
        </Text>

        {error ? (
          <Text style={styles.errorText}>
            {error}. Showing offline demo profiles.
          </Text>
        ) : null}

        {!user ? (
          <Text style={styles.errorText}>Sign in as an idea creator to submit ideas.</Text>
        ) : null}

        <Text style={styles.label}>Idea title</Text>
        <TextInput
          placeholder="Mindful commute companion"
          value={title}
          onChangeText={setTitle}
          style={styles.input}
          editable={!submitting}
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          placeholder="Describe the problem, target users, and success metrics."
          value={description}
          onChangeText={setDescription}
          style={[styles.input, styles.multilineInput]}
          multiline
          numberOfLines={6}
          editable={!submitting}
        />

        <Text style={styles.label}>Tags (comma separated)</Text>
        <TextInput
          placeholder="productivity, wellness"
          value={tagsText}
          onChangeText={setTagsText}
          style={styles.input}
          editable={!submitting}
        />

        <Text style={styles.label}>Submit as</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            enabled={!loadingProfiles && !submitting && Boolean(user)}
            selectedValue={creatorId}
            onValueChange={(value) => setCreatorId(value)}
          >
            {creators.map((creator) => (
              <Picker.Item key={creator.id} label={creator.username} value={creator.id} />
            ))}
          </Picker>
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, (submitting || !user) && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={submitting || !user}
        >
          <Text style={styles.primaryButtonText}>{submitting ? "Submitting…" : "Submit idea"}</Text>
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
    padding: 16,
  },
  heading: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  subheading: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 6,
    marginTop: 16,
  },
  input: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  multilineInput: {
    minHeight: 120,
    textAlignVertical: "top",
  },
  pickerWrapper: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  primaryButton: {
    backgroundColor: "#1f2937",
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 24,
  },
  disabledButton: {
    opacity: 0.7,
  },
  primaryButtonText: {
    textAlign: "center",
    color: "#ffffff",
    fontWeight: "600",
  },
  errorText: {
    color: "#b91c1c",
    marginBottom: 12,
  },
});

export default SubmitIdeaScreen;
