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

import { createAppSubmission } from "../api/apps";
import { listDevelopers } from "../api/profiles";
import { listIdeas } from "../api/ideas";
import type { Idea } from "../types";
import { mockDevelopers, mockIdeas } from "../mocks";
import type { RootStackParamList } from "../navigation/types";
import { useAuth } from "../context/AuthContext";

interface SubmitAppScreenProps extends NativeStackScreenProps<RootStackParamList, "SubmitApp"> {}

const SubmitAppScreen = ({ navigation, route }: SubmitAppScreenProps) => {
  const { user } = useAuth();
  const preSelectedIdeaId = route.params?.ideaId;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [ideaId, setIdeaId] = useState<string | undefined>(preSelectedIdeaId);
  const [developerId, setDeveloperId] = useState<string | undefined>(undefined);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [developers, setDevelopers] = useState(mockDevelopers);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFormData = useCallback(async () => {
    if (!user) {
      setIdeas(mockIdeas);
      setDevelopers(mockDevelopers);
      setIdeaId(preSelectedIdeaId ?? mockIdeas[0]?.id);
      setDeveloperId(undefined);
      setError("Sign in to submit your build.");
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const [ideaData, developerData] = await Promise.all([listIdeas(), listDevelopers()]);
      setIdeas(ideaData);
      const matchingDevelopers = developerData.filter((developer) => developer.id === user.id);
      setDevelopers(matchingDevelopers.length > 0 ? matchingDevelopers : developerData);
      if (preSelectedIdeaId) {
        setIdeaId(preSelectedIdeaId);
      } else if (ideaData.length > 0) {
        setIdeaId((prev) => prev ?? ideaData[0].id);
      }
      setDeveloperId(user.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load required data";
      setError(message);
      setIdeas(mockIdeas);
      setDevelopers(mockDevelopers);
      if (!ideaId && mockIdeas.length > 0) {
        setIdeaId(mockIdeas[0].id);
      }
      if (!developerId && mockDevelopers.length > 0) {
        setDeveloperId(mockDevelopers[0].id);
      }
    } finally {
      setLoading(false);
    }
  }, [preSelectedIdeaId, user]);

  useEffect(() => {
    void loadFormData();
  }, [loadFormData]);

  const selectedIdea = useMemo(() => ideas.find((candidate) => candidate.id === ideaId) ?? null, [ideaId, ideas]);

  const handleSubmit = useCallback(async () => {
    if (!user) {
      Alert.alert("Sign in required", "Log in to share your build.");
      return;
    }

    if (!ideaId || !developerId) {
      Alert.alert("Missing selection", "Pick both an idea and a developer profile.");
      return;
    }

    if (!title || !description || !url) {
      Alert.alert("Incomplete form", "Please fill in the title, description, and product URL.");
      return;
    }

    try {
      setSubmitting(true);
      const submission = await createAppSubmission({
        ideaId,
        title,
        description,
        url,
        developerId: user.id,
      });

      Alert.alert("Success", "App submission posted!", [
        {
          text: "View idea",
          onPress: () => navigation.replace("IdeaDetail", { ideaId }),
        },
      ]);
      setTitle("");
      setDescription("");
      setUrl("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to submit app";
      Alert.alert("Submission failed", message);
    } finally {
      setSubmitting(false);
    }
  }, [description, developerId, ideaId, navigation, title, url]);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.select({ ios: "padding", android: undefined })}
      keyboardVerticalOffset={Platform.select({ ios: 100, android: 0 })}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.heading}>Showcase your build</Text>
        <Text style={styles.subheading}>
          Link your project to an idea and help collaborators discover your work.
        </Text>

        {error ? (
          <Text style={styles.errorText}>
            {error}. Showing offline demo data.
          </Text>
        ) : null}

        {!user ? (
          <Text style={styles.errorText}>Sign in as a developer to submit your build.</Text>
        ) : null}

        <Text style={styles.label}>Idea</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            enabled={!loading && !submitting}
            selectedValue={ideaId}
            onValueChange={(value) => setIdeaId(value)}
          >
            {ideas.map((idea) => (
              <Picker.Item key={idea.id} label={idea.title} value={idea.id} />
            ))}
          </Picker>
        </View>

        <Text style={styles.label}>Submit as</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            enabled={!loading && !submitting && Boolean(user)}
            selectedValue={developerId}
            onValueChange={(value) => setDeveloperId(value)}
          >
            {developers.map((developer) => (
              <Picker.Item key={developer.id} label={developer.username} value={developer.id} />
            ))}
          </Picker>
        </View>

        <Text style={styles.label}>App title</Text>
        <TextInput
          placeholder="VolunteerNow"
          value={title}
          onChangeText={setTitle}
          style={styles.input}
          editable={!submitting}
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          placeholder="Summarize the build, tech stack, and what's next."
          value={description}
          onChangeText={setDescription}
          style={[styles.input, styles.multilineInput]}
          multiline
          numberOfLines={6}
          editable={!submitting}
        />

        <Text style={styles.label}>Product URL</Text>
        <TextInput
          placeholder="https://yourapp.com"
          value={url}
          onChangeText={setUrl}
          style={styles.input}
          autoCapitalize="none"
          keyboardType="url"
          editable={!submitting}
        />

        {selectedIdea ? (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryHeading}>Selected idea snapshot</Text>
            <Text style={styles.summaryTitle}>{selectedIdea.title}</Text>
            <Text style={styles.summaryBody} numberOfLines={3}>
              {selectedIdea.description}
            </Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.primaryButton, (submitting || !user) && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={submitting || !user}
        >
          <Text style={styles.primaryButtonText}>{submitting ? "Submitting…" : "Submit build"}</Text>
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
  summaryCard: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  summaryHeading: {
    fontSize: 12,
    color: "#6b7280",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
    color: "#111827",
  },
  summaryBody: {
    fontSize: 14,
    color: "#4b5563",
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

export default SubmitAppScreen;
