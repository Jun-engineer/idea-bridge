import "react-native-gesture-handler";

import { useMemo } from "react";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, StyleSheet, Text, useColorScheme, View } from "react-native";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";

import IdeaListScreen from "./src/screens/IdeaListScreen";
import IdeaDetailScreen from "./src/screens/IdeaDetailScreen";
import SubmitIdeaScreen from "./src/screens/SubmitIdeaScreen";
import SubmitAppScreen from "./src/screens/SubmitAppScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import AccountScreen from "./src/screens/AccountScreen";
import SignInScreen from "./src/screens/SignInScreen";
import SignUpScreen from "./src/screens/SignUpScreen";
import VerifyContactScreen from "./src/screens/VerifyContactScreen";
import type { RootStackParamList } from "./src/navigation/types";
import { AuthProvider, useAuth } from "./src/context/AuthContext";

const Stack = createNativeStackNavigator<RootStackParamList>();

function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" />
      <Text style={styles.loadingText}>Preparing Idea Bridge…</Text>
    </View>
  );
}

function RootNavigator() {
  const { user, loading, pendingVerification } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  const navigatorKey = user ? "app" : pendingVerification ? "verify" : "guest";
  const initialRouteName = user ? "Home" : pendingVerification ? "VerifyContact" : "SignIn";

  return (
    <Stack.Navigator key={navigatorKey} initialRouteName={initialRouteName}>
      {user ? (
        <>
          <Stack.Screen name="Home" component={IdeaListScreen} options={{ title: "Idea Bridge" }} />
          <Stack.Screen name="IdeaDetail" component={IdeaDetailScreen} options={{ title: "Idea" }} />
          <Stack.Screen name="SubmitIdea" component={SubmitIdeaScreen} options={{ title: "Submit Idea" }} />
          <Stack.Screen name="SubmitApp" component={SubmitAppScreen} options={{ title: "Submit App" }} />
          <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: "Profile" }} />
          <Stack.Screen
            name="AccountSettings"
            component={AccountScreen}
            options={{ title: "Account Settings" }}
          />
          <Stack.Screen name="VerifyContact" component={VerifyContactScreen} options={{ title: "Verify Phone" }} />
        </>
      ) : (
        <>
          <Stack.Screen name="SignIn" component={SignInScreen} options={{ title: "Sign In" }} />
          <Stack.Screen name="SignUp" component={SignUpScreen} options={{ title: "Sign Up" }} />
          <Stack.Screen name="VerifyContact" component={VerifyContactScreen} options={{ title: "Verify Phone" }} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  const scheme = useColorScheme();
  const theme = useMemo(() => (scheme === "dark" ? DarkTheme : DefaultTheme), [scheme]);

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={theme}>
        <StatusBar style={scheme === "dark" ? "light" : "dark"} />
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f9fafb",
  },
  loadingText: {
    marginTop: 12,
    color: "#6b7280",
  },
});
