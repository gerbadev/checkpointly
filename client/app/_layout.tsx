import React, { useEffect, useState } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { getHasOnboarded } from "@/lib/onboarding";

// Import gesture handler for Android compatibility
import 'react-native-gesture-handler';

import { PreferencesProvider } from "@/state/UserPreferencesContext";
import { LevelUpProvider } from "@/state/LevelUpContext";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PreferencesProvider>
        <LevelUpProvider>
          <Slot />
        </LevelUpProvider>
      </PreferencesProvider>
    </GestureHandlerRootView>
  );
}
