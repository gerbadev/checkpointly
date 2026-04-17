import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ImageBackground,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { theme } from "../constants/theme";
import { useThemeColors } from "../state/UserPreferencesContext";

interface PremiumModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function PremiumModal({ visible, onClose }: PremiumModalProps) {
  const colors = useThemeColors();

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <ImageBackground
        source={{ uri: "https://images.unsplash.com/photo-1614030635123-5e26ec0ea299?q=80&w=800&auto=format&fit=crop" }}
        style={styles.background}
      >
        <BlurView intensity={90} tint={colors.text === "#09090B" ? "light" : "dark"} style={StyleSheet.absoluteFill} />

        <View style={[styles.container, { backgroundColor: colors.surface + "E6", borderColor: colors.glassBorder }]}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>

          <Ionicons name="diamond" size={60} color="#FFD700" style={styles.icon} />
          
          <Text style={[styles.title, { color: colors.text }]}>Checkpointly Premium</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Otključajte puni potencijal i personalizirajte svoje putovanje kroz navike.
          </Text>

          <View style={styles.features}>
            <View style={[styles.featureItem, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
              <Ionicons name="color-palette" size={24} color={colors.primary} />
              <View style={styles.featureTextContainer}>
                <Text style={[styles.featureTitle, { color: colors.text }]}>Ekskluzivne Teme</Text>
                <Text style={[styles.featureDesc, { color: colors.muted }]}>Cyberpunk, Medieval i mnoge druge premium vizualne teme.</Text>
              </View>
            </View>

            <View style={[styles.featureItem, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
              <Ionicons name="hardware-chip" size={24} color={colors.primary} />
              <View style={styles.featureTextContainer}>
                <Text style={[styles.featureTitle, { color: colors.text }]}>Prioritetni AI Mentor</Text>
                <Text style={[styles.featureDesc, { color: colors.muted }]}>Dublji savjeti i napredno prilagođavanje težine checkpointa.</Text>
              </View>
            </View>

            <View style={[styles.featureItem, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
              <Ionicons name="flash" size={24} color={colors.primary} />
              <View style={styles.featureTextContainer}>
                <Text style={[styles.featureTitle, { color: colors.text }]}>Dvostruki XP</Text>
                <Text style={[styles.featureDesc, { color: colors.muted }]}>Brže napredovanje kroz razine za svaki dovršeni zadatak.</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.subscribeBtn}>
            <Text style={styles.subscribeText}>Nadogradite za €4.99/mj</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    </Modal>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, justifyContent: "flex-end" },
  container: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    paddingBottom: 40,
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  closeBtn: { alignSelf: "flex-end", marginBottom: 10 },
  icon: { alignSelf: "center", marginBottom: 15 },
  title: {
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 22,
  },
  features: { marginBottom: 35 },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  featureTextContainer: { marginLeft: 15, flex: 1 },
  featureTitle: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  featureDesc: { fontSize: 13, lineHeight: 18 },
  subscribeBtn: {
    backgroundColor: "#FFD700",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
  },
  subscribeText: { color: "#000", fontSize: 16, fontWeight: "bold" },
});
