// app/(onboarding)/_layout.tsx
import React from "react";
import { Stack } from "expo-router";
import { OnboardingProvider } from "./_store";

export default function OnboardingLayout() {
  return (
    <OnboardingProvider>
      <Stack
        screenOptions={{
          headerShown: false,         
          animation: "slide_from_right",
        }}
      />
    </OnboardingProvider>
  );
}
