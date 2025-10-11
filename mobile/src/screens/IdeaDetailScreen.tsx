import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { getIdea } from "../api/ideas";
import type { AppSubmission, Idea } from "../types";
import { mockIdeas, mockSubmissions } from "../mocks";
import type { RootStackParamList } from "../navigation/types";

interface IdeaDetailScreenProps extends NativeStackScreenProps<RootStackParamList, "IdeaDetail"> {}

const IdeaDetailScreen = ({ route, navigation }: IdeaDetailScreenProps) => {
  const { ideaId } = route.params;
  const [idea, setIdea] = useState<Idea | null>(null);
  const [submissions, setSubmissions] = useState<AppSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadIdeaDetail = useCallback(async () => {
    try {
      setError(null);
      const data = await getIdea(ideaId);
      setIdea(data.idea);
      setSubmissions(data.submissions);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load idea";
      setError(message);
      const fallbackIdea = mockIdeas.find((candidate) => candidate.id === ideaId) ?? null;
      setIdea(fallbackIdea);
      setSubmissions(mockSubmissions.filter((submission) => submission.ideaId === ideaId));
    } finally {
      setLoading(false);
    }
  }, [ideaId]);

  useEffect(() => {
    void loadIdeaDetail();
  }, [loadIdeaDetail]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
        <Text style={styles.muted}>Loading idea details…</Text>
      </View>
    );
  }

  if (!idea) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>We couldn't find this idea right now.</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.primaryButtonText}>Back to list</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {error ? (
        <Text style={styles.errorText}>
          {error}. Showing offline demo data.
        </Text>
      ) : null}

      <Text style={styles.title}>{idea.title}</Text>
      <Text style={styles.meta}>By {idea.creator.username}</Text>
      <View style={styles.tagsRow}>
        {idea.tags.map((tag) => (
          <View key={tag} style={styles.tagChip}>
            <Text style={styles.tagText}>#{tag}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionHeading}>Overview</Text>
      <Text style={styles.body}>{idea.description}</Text>

      <Text style={styles.sectionHeading}>Submissions</Text>
      {submissions.length === 0 ? (
        <Text style={styles.muted}>No submissions yet. Be the first to submit an app!</Text>
      ) : (
        submissions.map((submission) => (
          <View key={submission.id} style={styles.submissionCard}>
            <Text style={styles.submissionTitle}>{submission.title}</Text>
            <Text style={styles.body}>{submission.description}</Text>
            <Text style={styles.meta}>
              By {submission.developer.username} • {new Date(submission.submittedAt).toLocaleDateString()}
            </Text>
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => navigation.navigate("Profile", { role: "developer", id: submission.developer.id })}
            >
              <Text style={styles.linkButtonText}>View developer profile</Text>
            </TouchableOpacity>
          </View>
        ))
      )}

      <TouchableOpacity
        style={[styles.primaryButton, styles.submitButton]}
        onPress={() => navigation.navigate("SubmitApp", { ideaId })}
      >
        <Text style={styles.primaryButtonText}>Submit your build</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  content: {
    padding: 16,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 4,
    color: "#111827",
  },
  meta: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 12,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  tagChip: {
    backgroundColor: "#e5e7eb",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  tagText: {
    fontSize: 12,
    color: "#374151",
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
    color: "#111827",
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: "#374151",
  },
  submissionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  submissionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
    color: "#111827",
  },
  muted: {
    fontSize: 14,
    color: "#6b7280",
  },
  errorText: {
    color: "#b91c1c",
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: "#1f2937",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginTop: 16,
  },
  primaryButtonText: {
    color: "#ffffff",
    textAlign: "center",
    fontWeight: "600",
  },
  submitButton: {
    marginBottom: 24,
  },
  linkButton: {
    marginTop: 12,
  },
  linkButtonText: {
    color: "#2563eb",
    fontWeight: "500",
  },
});

export default IdeaDetailScreen;
