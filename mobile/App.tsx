import "react-native-gesture-handler";

import { useMemo } from "react";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";

import IdeaListScreen from "./src/screens/IdeaListScreen";
import IdeaDetailScreen from "./src/screens/IdeaDetailScreen";
import SubmitIdeaScreen from "./src/screens/SubmitIdeaScreen";
import SubmitAppScreen from "./src/screens/SubmitAppScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import type { RootStackParamList } from "./src/navigation/types";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const scheme = useColorScheme();
  const theme = useMemo(() => (scheme === "dark" ? DarkTheme : DefaultTheme), [scheme]);

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={theme}>
        <StatusBar style={scheme === "dark" ? "light" : "dark"} />
        <Stack.Navigator>
          <Stack.Screen name="Home" component={IdeaListScreen} options={{ title: "Idea Bridge" }} />
          <Stack.Screen name="IdeaDetail" component={IdeaDetailScreen} options={{ title: "Idea" }} />
          <Stack.Screen name="SubmitIdea" component={SubmitIdeaScreen} options={{ title: "Submit Idea" }} />
          <Stack.Screen name="SubmitApp" component={SubmitAppScreen} options={{ title: "Submit App" }} />
          <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: "Profile" }} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
