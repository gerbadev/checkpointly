import React from "react";
import { View, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { OBButton, OBContainer, OBText, OBFooter } from "./_ui";
import { setHasOnboarded } from "@/lib/onboarding";
import { API_URL } from "@/constants/api";
import { getToken } from "@/lib/auth";

export default function OnboardingDone() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const habitId = typeof params.habitId === "string" ? params.habitId : null;

  async function finish() {
    try {
      await setHasOnboarded(true);

      const token = await getToken();
      if (!token) throw new Error("Nema tokena. Prijavi se ponovno.");

      const res = await fetch(`${API_URL}/profile/onboarding/complete`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || "Ne mogu spremiti onboarding status na server.");
      }

      if (habitId) router.replace(`/habits/${habitId}`);
      else router.replace("/(tabs)/dashboard");
    } catch (e: any) {
      Alert.alert("Greška", e?.message || "Nešto nije u redu.");
      if (habitId) router.replace(`/habits/${habitId}`);
      else router.replace("/(tabs)/dashboard");
    }
  }

  return (
    <OBContainer>
      <View style={{ flex: 1, justifyContent: "center", gap: 14 }}>
        <OBText variant="hero">Spremno ✨</OBText>
        <OBText variant="muted">
          Tvoja prva avantura je kreirana. Idemo na prvu točku.
        </OBText>

        <OBFooter>
          <OBButton title="Uđi u avanturu" onPress={finish} />
        </OBFooter>
      </View>
    </OBContainer>
  );
}
