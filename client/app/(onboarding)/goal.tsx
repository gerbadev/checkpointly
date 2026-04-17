import React, { useMemo } from "react";
import { View } from "react-native";
import { useOnboarding, type OnboardingGoal } from "./_store";
import { OBContainer, ProgressDots, OBText, OBNavFooter, OBOptionRow, } from "./_ui";

const GOALS: { id: OnboardingGoal; label: string }[] = [
  { id: "habit", label: "Izgraditi naviku" },
  { id: "consistency", label: "Biti konzistentniji" },
  { id: "project", label: "Završiti projekt" },
  { id: "energy_sleep", label: "Više energije / bolji san" },
  { id: "explore", label: "Samo istražujem" },
];

export default function OnboardingGoal() {
  const { state, setState } = useOnboarding();
  const selected = useMemo(() => new Set(state.goals), [state.goals]);

  function toggle(id: OnboardingGoal) {
    setState((p) => {
      const s = new Set(p.goals);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return { ...p, goals: Array.from(s) };
    });
  }

  const canNext = state.goals.length > 0;

  return (
    <OBContainer>
      <View style={{ flex: 1, gap: 14 }}>
        <ProgressDots step={2} total={6} />

        <OBText variant="title">Cilj</OBText>
        <OBText variant="muted">Možete odabrati više opcija — prilagodit ćemo putanju.</OBText>

        <View style={{ marginTop: 8, gap: 10 }}>
          {GOALS.map((g) => (
            <OBOptionRow key={g.id} label={g.label} selected={selected.has(g.id)} onPress={() => toggle(g.id)} />
          ))}
        </View>

        <View style={{ marginTop: "auto" as any }}>
          <OBNavFooter backHref="/(onboarding)/interests" nextHref="/(onboarding)/tempo" nextDisabled={!canNext} />
        </View>
      </View>
    </OBContainer>
  );
}
