import React from "react";
import { View, Image, StyleSheet } from "react-native";
import { OBContainer, ProgressDots, OBText, OBNavFooter } from "./_ui";

export default function OnboardingHowItWorks() {
  return (
    <OBContainer>
      <View style={{ flex: 1, gap: 18 }}>
        <ProgressDots step={4} total={6} />

        <OBText variant="title">Kako funkcionira Checkpointly</OBText>
        <OBText variant="muted">
          Pretvaramo cilj u jasnu putanju malih koraka — i vodimo te dan po dan.
        </OBText>

        {/* 1 */}
        <View style={styles.card}>
          <OBText variant="body">1️⃣ Postavi cilj</OBText>
          <OBText variant="cap">
            Upisuješ što želiš postići i biraš temu. AI generira konkretne korake.
          </OBText>

          <Image
            source={require("../../assets/onboarding/how_create.png")}
            style={styles.img}
            resizeMode="cover"
          />
        </View>

        {/* 2 */}
        <View style={styles.card}>
          <OBText variant="body">2️⃣ Prati putanju</OBText>
          <OBText variant="cap">
            Svaka avantura ima mapu. Rješavaš jednu točku po jednu — bez kaosa.
          </OBText>

          <Image
            source={require("../../assets/onboarding/how_map.png")}
            style={styles.img}
            resizeMode="cover"
          />
        </View>

        {/* 3 */}
        <View style={styles.card}>
          <OBText variant="body">3️⃣ XP, bonus i niz</OBText>
          <OBText variant="cap">
            Svaki dan dobiješ XP i bonus. Niz čuva kontinuitet i motivaciju.
          </OBText>

          <Image
            source={require("../../assets/onboarding/how_today.png")}
            style={styles.img}
            resizeMode="cover"
          />
        </View>

        <View style={{ marginTop: "auto" }}>
          <OBNavFooter
            backHref="/(onboarding)/tempo"
            nextHref="/(onboarding)/first-adventure"
            nextLabel="Nastavi"
          />
        </View>
      </View>
    </OBContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    padding: 14,
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  img: {
    width: "100%",
    height: 150,
    borderRadius: 12,
  },
});
