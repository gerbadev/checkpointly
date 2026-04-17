import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet } from "react-native";
import { theme } from "../../constants/theme";
import { AdventureThemeProvider, useAdventureTheme } from "@/state/adventureThemeContext";
import { SocialProvider } from "@/state/SocialContext";
import { usePreferences } from "@/state/UserPreferencesContext";

function TabsInner() {
  const { currentAccent } = useAdventureTheme();
  const { preferences } = usePreferences();
  const colors = theme.getColors(preferences.darkMode);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,

        tabBarActiveTintColor: currentAccent || colors.primary, 
        tabBarInactiveTintColor: colors.faint,

        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "800",
          marginBottom: 4,
        },

        tabBarStyle: {
          position: "absolute",
          bottom: Platform.OS === "ios" ? 30 : 20,
          left: 20,
          right: 20,
          height: 64,
          borderRadius: 32,
          borderTopWidth: 0,
          backgroundColor: "transparent",
          elevation: 0,
          shadowColor: 'transparent',
          overflow: 'hidden',
        },

        tabBarBackground: () => (
          <BlurView
            intensity={80}
            tint={preferences.darkMode ? "dark" : "light"}
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: preferences.darkMode ? "rgba(18, 20, 26, 0.7)" : "rgba(255, 255, 255, 0.7)",
                borderRadius: 32,
                borderWidth: 1,
                borderColor: colors.glassBorder,
              }
            ]}
          />
        ),
      }}
    >
      <Tabs.Screen
        name="habits"
        options={{
          tabBarLabel: "Avanture",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "compass" : "compass-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="social"
        options={{
          tabBarLabel: "Prijatelji",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "people" : "people-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="dashboard"
        options={{
          tabBarLabel: "Mapa",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "map" : "map-outline"} size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile/index"
        options={{
          title: "Profil",
          tabBarLabel: "Profil",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}

export default function TabsLayout() {
  return (
    <AdventureThemeProvider>
      <SocialProvider>
        <TabsInner />
      </SocialProvider>
    </AdventureThemeProvider>
  );
}
