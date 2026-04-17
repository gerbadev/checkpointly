import React from "react";
import { View } from "react-native";
import { OBContainer, ProgressDots, OBText, OBNavFooter } from "./_ui";

export default function OnboardingWelcome() {
  return (
    <OBContainer>
      <View style={{ flex: 1, gap: 14 }}>
        <ProgressDots step={0} total={6} />

        <OBText variant="hero">Dobrodošli 👋</OBText>
        <OBText variant="muted">
          U par kratkih koraka složit ćemo vam prvu avanturu: odaberite interese, cilj i tempo — a mi generiramo putanju
          s jasnim dnevnim točkama, XP-om i nizom koji vas drži u ritmu.
        </OBText>

        <View style={{ marginTop: "auto" as any }}>
          <OBNavFooter hideBack nextHref="/(onboarding)/interests" nextLabel="Krenimo" />
        </View>
      </View>
    </OBContainer>
  );
}
