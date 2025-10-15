import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { RootStackParamList } from "../navigation/types";

const CONTACT_EMAIL = "jun.nammoku@gmail.com";

interface PrivacyPolicyScreenProps extends NativeStackScreenProps<RootStackParamList, "PrivacyPolicy"> {}

const sections = [
  {
    title: "What data we collect",
    body: [
      "Account details: name, email address, and phone number for verification.",
      "Profile content: bios, portfolio links, and any information you add to idea or app submissions.",
      "Usage signals: device information and interaction events that help us keep IdeaBridge secure.",
    ],
  },
  {
    title: "How we use your data",
    body: [
      "To authenticate you and maintain secure sessions across devices.",
      "To match idea creators with builders and help collaborators find each other.",
      "To send important notifications about account activity, verification, and project updates.",
    ],
  },
  {
    title: "Who we share data with",
    body: [
      "Infrastructure partners: AWS services that host our API, storage, and notifications.",
      "SMS providers: third parties that deliver one-time passcodes during verification.",
      "No ad networks or data brokers—your information stays focused on IdeaBridge collaborations.",
    ],
  },
  {
    title: "Your choices",
    body: [
      "You can request data exports or deletion at any time by contacting support.",
      "You control what is visible on your public profile and submissions.",
      "Opt out of marketing emails inside Account Settings once they become available.",
    ],
  },
];

const PrivacyPolicyScreen = ({ navigation }: PrivacyPolicyScreenProps) => {
  const openEmail = () => {
    void Linking.openURL(`mailto:${CONTACT_EMAIL}`);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Privacy Policy</Text>
        <Text style={styles.subtitle}>
          We keep IdeaBridge focused on collaborative innovation while safeguarding your information.
        </Text>
      </View>

      {sections.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          {section.body.map((paragraph) => (
            <Text key={paragraph} style={styles.paragraph}>
              {paragraph}
            </Text>
          ))}
        </View>
      ))}

      <View style={styles.footerCard}>
        <Text style={styles.footerTitle}>Questions about privacy?</Text>
        <Text style={styles.footerText}>
          Reach out to <Text style={styles.highlight}>{CONTACT_EMAIL}</Text> and we’ll respond within two business days.
        </Text>
        <TouchableOpacity style={styles.footerButton} onPress={openEmail}>
          <Text style={styles.footerButtonText}>Contact privacy team</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryLink} onPress={() => navigation.navigate("Support")}>
          <Text style={styles.secondaryLinkText}>Need other help? Visit support</Text>
        </TouchableOpacity>
        <Text style={styles.copyright}>© {new Date().getFullYear()} Jun Nammoku</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: "#0b1120",
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
    color: "#c7d2fe",
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
    color: "#e0e7ff",
    marginBottom: 12,
  },
  paragraph: {
    color: "#e2e8f0",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 10,
  },
  footerCard: {
    padding: 24,
    borderRadius: 18,
    backgroundColor: "rgba(59, 130, 246, 0.12)",
    marginBottom: 32,
  },
  footerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#bfdbfe",
    marginBottom: 12,
  },
  footerText: {
    color: "#dbeafe",
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 20,
  },
  highlight: {
    color: "#f472b6",
    fontWeight: "600",
  },
  footerButton: {
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  footerButtonText: {
    color: "#f8fafc",
    fontWeight: "700",
    fontSize: 16,
  },
  secondaryLink: {
    alignItems: "center",
    paddingVertical: 8,
  },
  secondaryLinkText: {
    color: "#93c5fd",
    fontSize: 15,
    textDecorationLine: "underline",
  },
  copyright: {
    marginTop: 16,
    color: "#93c5fd",
    fontSize: 13,
    textAlign: "center",
  },
});

export default PrivacyPolicyScreen;
