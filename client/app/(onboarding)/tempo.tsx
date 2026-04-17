import React from "react";
import { View } from "react-native";
import { useOnboarding } from "./_store";
import { OBContainer, ProgressDots, OBText, OBNavFooter, OBOptionRow, } from "./_ui";

export default function OnboardingTempo() {
  const { state, setState } = useOnboarding();

  return (
    <OBContainer>
      <View style={{ flex: 1, gap: 14 }}>
        <ProgressDots step={3} total={6} />

        <OBText variant="title">Tempo</OBText>
        <OBText variant="muted">Koliko vremena realno imate dnevno? Ovo nam pomaže složiti izvedive točke.</OBText>

        <View style={{ marginTop: 8, gap: 10 }}>
          <OBOptionRow label="5 min (lagano)" selected={state.minutesPerDay === 5} onPress={() => setState(p => ({...p, minutesPerDay: 5}))} />
          <OBOptionRow label="10–15 min (standard)" selected={state.minutesPerDay === 10} onPress={() => setState(p => ({...p, minutesPerDay: 10}))} />
          <OBOptionRow label="20+ min (ambiciozno)" selected={state.minutesPerDay === 20} onPress={() => setState(p => ({...p, minutesPerDay: 20}))} />
        </View>

        <View style={{ marginTop: "auto" as any }}>
          <OBNavFooter backHref="/(onboarding)/goal" nextHref="/(onboarding)/how-it-works" />
        </View>
      </View>
    </OBContainer>
  );
}
