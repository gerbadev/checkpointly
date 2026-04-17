import React, { useMemo, useState } from "react";
import { View, TextInput } from "react-native";
import { useOnboarding } from "./_store";
import { OBContainer, ProgressDots, OBText, OBNavFooter, OBOptionRow, } from "./_ui";

const PRESETS = [
  "Fitness","Trčanje","Teretana","Učenje jezika","Čitanje","Pisanje",
  "Produktivnost","Fokus","Organizacija","Meditacija","San","Mindfulness",
  "Prehrana","Kuhanje","Kreativno","Glazba","Crtanje",
];

export default function OnboardingInterests() {
  const { state, setState } = useOnboarding();
  const [custom, setCustom] = useState("");
  const selected = useMemo(() => new Set(state.interests), [state.interests]);

  function toggle(label: string) {
    setState((prev) => {
      const s = new Set(prev.interests);
      if (s.has(label)) s.delete(label);
      else s.add(label);
      return { ...prev, interests: Array.from(s) };
    });
  }

  function addCustom() {
    const v = custom.trim();
    if (!v) return;
    toggle(v);
    setCustom("");
  }

  const canNext = state.interests.length > 0;

  return (
    <OBContainer>
      <View style={{ flex: 1, gap: 14 }}>
        <ProgressDots step={1} total={6} />

        <OBText variant="title">Interesi</OBText>
        <OBText variant="muted">
          Odaberite nekoliko interesa — koristit ćemo ih za bolje prijedloge i personalizaciju putanje.
        </OBText>

        <View style={{ marginTop: 8, gap: 10 }}>
          {PRESETS.map((x) => (
            <OBOptionRow key={x} label={x} selected={selected.has(x)} onPress={() => toggle(x)} />
          ))}
        </View>

        <View style={{ marginTop: 16, gap: 10 }}>
          <OBNavFooter
            backHref="/(onboarding)/welcome"
            nextHref="/(onboarding)/goal"
            nextDisabled={!canNext}
            nextLabel="Naprijed"
          />
        </View>
      </View>
    </OBContainer>
  );
}
