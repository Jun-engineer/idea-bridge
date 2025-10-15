import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { RootStackParamList } from "../navigation/types";

const CONTACT_EMAIL = "jun.nammoku@gmail.com";
const COMMUNITY_LINK = "https://ideabridge.app";

interface SupportScreenProps extends NativeStackScreenProps<RootStackParamList, "Support"> {}

const SupportScreen = ({ navigation }: SupportScreenProps) => {
  const openEmail = () => {
    void Linking.openURL(`mailto:${CONTACT_EMAIL}`);
  };

  const openCommunity = () => {
    void Linking.openURL(COMMUNITY_LINK);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Contact & Support</Text>
      <Text style={styles.subtitle}>
        We’re here to help with account access, idea submissions, security questions, and feedback.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Email support</Text>
        <Text style={styles.cardText}>
          Reach out anytime at <Text style={styles.highlight}>{CONTACT_EMAIL}</Text>. We respond within one business day.
        </Text>
        <TouchableOpacity style={styles.button} onPress={openEmail}>
          <Text style={styles.buttonText}>Email us</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Partnerships & feedback</Text>
        <Text style={styles.cardText}>
          Want to partner with IdeaBridge, report a bug, or suggest a feature? Drop us a note and we’ll follow up.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Community updates</Text>
        <Text style={styles.cardText}>
          Stay on top of roadmap releases and collaboration opportunities on our community hub.
        </Text>
        <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={openCommunity}>
          <Text style={styles.secondaryButtonText}>Visit community site</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.card, styles.linkCard]}>
        <Text style={styles.cardTitle}>More resources</Text>
        <TouchableOpacity style={styles.linkButton} onPress={() => navigation.navigate("Instructions")}>
          <Text style={styles.linkButtonText}>How IdeaBridge works</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkButton} onPress={() => navigation.navigate("PrivacyPolicy")}>
          <Text style={styles.linkButtonText}>Privacy policy</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    backgroundColor: "#f8fafc",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0f172a",
  },
  subtitle: {
    marginTop: 12,
    fontSize: 16,
    color: "#475569",
    lineHeight: 22,
    marginBottom: 24,
  },
  card: {
    backgroundColor: "#ffffff",
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 12,
  },
  cardText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#4b5563",
    marginBottom: 16,
  },
  highlight: {
    color: "#2563eb",
    fontWeight: "600",
  },
  button: {
    backgroundColor: "#1f2937",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "#f8fafc",
    fontWeight: "700",
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: "#e2e8f0",
  },
  secondaryButtonText: {
    color: "#1e293b",
    fontWeight: "700",
    fontSize: 16,
  },
  linkCard: {
    gap: 12,
  },
  linkButton: {
    paddingVertical: 12,
  },
  linkButtonText: {
    color: "#2563eb",
    fontWeight: "600",
    fontSize: 16,
  },
});

export default SupportScreen;
