import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { listIdeas } from "../api/ideas";
import type { Idea } from "../types";
import { mockIdeas } from "../mocks";
import type { RootStackParamList } from "../navigation/types";

interface IdeaListScreenProps extends NativeStackScreenProps<RootStackParamList, "Home"> {}

const IdeaListScreen = ({ navigation }: IdeaListScreenProps) => {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadIdeas = useCallback(async () => {
    try {
      setError(null);
      const data = await listIdeas();
      setIdeas(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load ideas";
      setError(message);
      setIdeas(mockIdeas);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadIdeas();
  }, [loadIdeas]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadIdeas();
  }, [loadIdeas]);

  const renderIdea = ({ item }: { item: Idea }) => (
    <TouchableOpacity
      style={styles.ideaCard}
      onPress={() => navigation.navigate("IdeaDetail", { ideaId: item.id })}
    >
      <Text style={styles.ideaTitle}>{item.title}</Text>
      <Text style={styles.ideaDescription} numberOfLines={3}>
        {item.description}
      </Text>
      <View style={styles.tagContainer}>
        {item.tags.map((tag) => (
          <View key={tag} style={styles.tagChip}>
            <Text style={styles.tagText}>#{tag}</Text>
          </View>
        ))}
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.metaText}>By {item.creator.username}</Text>
        <Text style={styles.metaText}>{item.likes} likes</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
        <Text style={styles.metaText}>Loading ideas…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate("SubmitIdea")}>
          <Text style={styles.actionButtonText}>Submit Idea</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate("SubmitApp", {})}>
          <Text style={styles.actionButtonText}>Submit App</Text>
        </TouchableOpacity>
      </View>

      {error ? (
        <Text style={styles.errorText}>
          {error}. Showing offline demo data.
        </Text>
      ) : null}

      <FlatList
        data={ideas}
        keyExtractor={(item) => item.id}
        renderItem={renderIdea}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={ideas.length === 0 ? styles.emptyList : undefined}
        ListEmptyComponent={<Text style={styles.metaText}>No ideas yet. Be the first to submit one!</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7f7f7",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: "#1f2937",
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  actionButtonText: {
    textAlign: "center",
    color: "#ffffff",
    fontWeight: "600",
  },
  errorText: {
    color: "#b91c1c",
    marginBottom: 12,
    textAlign: "center",
  },
  ideaCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  ideaTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    color: "#111827",
  },
  ideaDescription: {
    fontSize: 14,
    color: "#4b5563",
    marginBottom: 12,
  },
  tagContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
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
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metaText: {
    fontSize: 12,
    color: "#6b7280",
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default IdeaListScreen;
