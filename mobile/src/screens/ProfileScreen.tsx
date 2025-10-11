import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { getDeveloperProfile, getIdeaCreatorProfile } from "../api/profiles";
import type { DeveloperProfile, IdeaCreatorProfile } from "../types";
import { mockDevelopers, mockIdeaCreators } from "../mocks";
import type { RootStackParamList } from "../navigation/types";

interface ProfileScreenProps extends NativeStackScreenProps<RootStackParamList, "Profile"> {}

type Profile = DeveloperProfile | IdeaCreatorProfile;

type ProfileState = {
  profile: Profile | null;
  loading: boolean;
  error: string | null;
};

const ProfileScreen = ({ route }: ProfileScreenProps) => {
  const { role, id } = route.params;
  const [{ profile, loading, error }, setProfileState] = useState<ProfileState>({
    profile: null,
    loading: true,
    error: null,
  });

  const loadProfile = useCallback(async () => {
    try {
      setProfileState({ profile: null, loading: true, error: null });
      if (role === "developer") {
        const data = await getDeveloperProfile(id);
        setProfileState({ profile: data, loading: false, error: null });
        return;
      }
      const data = await getIdeaCreatorProfile(id);
      setProfileState({ profile: data, loading: false, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load profile";
      const fallback = role === "developer"
        ? mockDevelopers.find((developer) => developer.id === id) ?? null
        : mockIdeaCreators.find((creator) => creator.id === id) ?? null;
      setProfileState({ profile: fallback, loading: false, error: message });
    }
  }, [id, role]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
        <Text style={styles.muted}>Loading profile…</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Profile not available right now.</Text>
      </View>
    );
  }

  const isDeveloper = role === "developer";
  const developerProfile = isDeveloper ? (profile as DeveloperProfile) : null;
  const ideaCreatorProfile = !isDeveloper ? (profile as IdeaCreatorProfile) : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {error ? (
        <Text style={styles.errorText}>
          {error}. Showing offline demo profile.
        </Text>
      ) : null}

      <View style={styles.header}>
        <Text style={styles.title}>{profile.username}</Text>
        <Text style={styles.roleBadge}>{isDeveloper ? "Developer" : "Idea Creator"}</Text>
      </View>
      {profile.bio ? <Text style={styles.body}>{profile.bio}</Text> : null}

      {isDeveloper && developerProfile ? (
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Apps</Text>
          {developerProfile.apps.length === 0 ? (
            <Text style={styles.muted}>No apps submitted yet.</Text>
          ) : (
            developerProfile.apps.map((app) => (
              <View key={app.id} style={styles.card}>
                <Text style={styles.cardTitle}>{app.title}</Text>
                <Text style={styles.body}>{app.description}</Text>
                <Text style={styles.muted}>
                  {new Date(app.submittedAt).toLocaleDateString()} • {app.likeCount} likes
                </Text>
              </View>
            ))
          )}
        </View>
      ) : null}
      {!isDeveloper && ideaCreatorProfile ? (
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Ideas</Text>
          {ideaCreatorProfile.ideas.length === 0 ? (
            <Text style={styles.muted}>No ideas published yet.</Text>
          ) : (
            ideaCreatorProfile.ideas.map((idea) => (
              <View key={idea.id} style={styles.card}>
                <Text style={styles.cardTitle}>{idea.title}</Text>
                <Text style={styles.body}>{idea.description}</Text>
                <Text style={styles.muted}>
                  {new Date(idea.createdAt).toLocaleDateString()} • {idea.likes} likes
                </Text>
              </View>
            ))
          )}
        </View>
      ) : null}
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
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#111827",
  },
  roleBadge: {
    marginTop: 6,
    alignSelf: "flex-start",
    backgroundColor: "#111827",
    color: "#ffffff",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: "600",
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: "#374151",
  },
  section: {
    marginTop: 24,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
    color: "#111827",
  },
  muted: {
    fontSize: 13,
    color: "#6b7280",
  },
  errorText: {
    color: "#b91c1c",
    marginBottom: 12,
  },
});

export default ProfileScreen;
