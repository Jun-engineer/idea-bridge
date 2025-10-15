import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { RootStackParamList } from "../navigation/types";

const CONTACT_EMAIL = "jun.nammoku@gmail.com";

interface InstructionsScreenProps extends NativeStackScreenProps<RootStackParamList, "Instructions"> {}

const sections = [
  {
    title: "1. Create your account",
    bullets: [
      "Choose whether you want to share ideas or build apps—you can switch roles at any time.",
      "Verify your phone number so collaborators know you are a real person.",
      "Fill out your profile with a display name, short bio, and any portfolio links.",
    ],
  },
  {
    title: "2. Explore existing ideas",
    bullets: [
      "Browse the Ideas feed to see open problems from the community.",
      "Open any idea card to review its description, target audience, and constraints.",
      "Bookmark the ideas you like so they stay handy when you are ready to build.",
    ],
  },
  {
    title: "3. Share your own idea",
    bullets: [
      "Tap Submit Idea and describe the challenge you want solved.",
      "Add clear acceptance criteria, business context, and any design references.",
      "More detail leads to better matches—set expectations up front for collaborators.",
    ],
  },
  {
    title: "4. Build or propose an app",
    bullets: [
      "Developers can submit an app for any idea and include prototypes or production builds.",
      "List the tech stack, deployment status, and what kind of help you need next.",
      "Attach screenshots, videos, or links so idea owners can evaluate quickly.",
    ],
  },
  {
    title: "5. Collaborate and iterate",
    bullets: [
      "Follow profiles of creators and developers you trust.",
      "Update your submissions whenever you push new features or fixes.",
      "Keep communication transparent—steady collaboration leads to successful launches.",
    ],
  },
];

const InstructionsScreen = ({ navigation }: InstructionsScreenProps) => {
  const openEmail = () => {
    void Linking.openURL(`mailto:${CONTACT_EMAIL}`);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>How IdeaBridge Works</Text>
        <Text style={styles.subtitle}>
          Follow this quick walkthrough to go from a fresh account to collaborating on new products.
        </Text>
      </View>

      {sections.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          {section.bullets.map((bullet) => (
            <View key={bullet} style={styles.bulletRow}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>{bullet}</Text>
            </View>
          ))}
        </View>
      ))}

      <View style={styles.supportCard}>
        <Text style={styles.supportTitle}>Need help?</Text>
        <Text style={styles.supportText}>
          Send us a note at <Text style={styles.email}>{CONTACT_EMAIL}</Text> and we’ll step in.
        </Text>
        <TouchableOpacity style={styles.supportButton} onPress={openEmail}>
          <Text style={styles.supportButtonText}>Email support</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.supportLink} onPress={() => navigation.navigate("PrivacyPolicy")}>
          <Text style={styles.supportLinkText}>Review our privacy policy</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: "#0f172a",
    flexGrow: 1,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#f8fafc",
  },
  subtitle: {
    marginTop: 12,
    fontSize: 16,
    lineHeight: 22,
    color: "#cbd5f5",
  },
  section: {
    marginBottom: 24,
    padding: 20,
    borderRadius: 16,
    backgroundColor: "rgba(30, 41, 59, 0.85)",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#f1f5f9",
    marginBottom: 12,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  bullet: {
    color: "#38bdf8",
    fontSize: 16,
    marginRight: 10,
    lineHeight: 22,
  },
  bulletText: {
    flex: 1,
    color: "#e2e8f0",
    fontSize: 15,
    lineHeight: 22,
  },
  supportCard: {
    padding: 24,
    borderRadius: 18,
    backgroundColor: "rgba(59, 130, 246, 0.12)",
    marginBottom: 32,
  },
  supportTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#bfdbfe",
    marginBottom: 12,
  },
  supportText: {
    color: "#dbeafe",
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 20,
  },
  email: {
    color: "#f472b6",
    fontWeight: "600",
  },
  supportButton: {
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  supportButtonText: {
    color: "#f8fafc",
    fontWeight: "700",
    fontSize: 16,
  },
  supportLink: {
    alignItems: "center",
    paddingVertical: 8,
  },
  supportLinkText: {
    color: "#93c5fd",
    fontSize: 15,
    textDecorationLine: "underline",
  },
});

export default InstructionsScreen;
