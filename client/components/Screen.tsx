import React, { useEffect, useRef, useMemo } from "react";
import { ScrollView, View, ViewStyle, StyleSheet, Dimensions, Animated, Easing } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "../constants/theme";
import { usePreferences } from "@/state/UserPreferencesContext";

const { width, height } = Dimensions.get("window");

export function Screen({
  children,
  scroll = false,
  contentStyle,
  style,
  background,
  disableDefaultBackground = false,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  contentStyle?: ViewStyle;
  style?: ViewStyle;
  background?: React.ReactNode; 
  disableDefaultBackground?: boolean; 
}) {
  const Container: any = scroll ? ScrollView : View;
  const { preferences } = usePreferences();
  const colors = theme.getColors(preferences.darkMode);

  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    anim.setValue(0);
    const loop = Animated.loop(
      Animated.timing(anim, {
        toValue: 1,
        duration: 25000, 
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  const p1 = useMemo(() => ({
    x: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 80, 0] }),
    y: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 40, 0] })
  }), [anim]);
  
  const p2 = useMemo(() => ({
    x: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -60, 0] }),
    y: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -90, 0] })
  }), [anim]);

  const p3 = useMemo(() => ({
    x: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -70, 0] }),
    y: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 60, 0] })
  }), [anim]);

  return (
    <View style={[{ flex: 1, backgroundColor: colors.bg }, style]}>
      {!disableDefaultBackground && !background && (
        <View style={StyleSheet.absoluteFill}>
          {/* Base Midnight Gradient */}
          <LinearGradient
            colors={[colors.bg, colors.midnight]}
            style={StyleSheet.absoluteFill}
          />
          
          {/* Mesh Gradient Blobs */}
          <Animated.View style={[styles.blob, { top: -height * 0.1, left: -width * 0.2, backgroundColor: colors.primary, opacity: 0.12, transform: [{ translateX: p1.x }, { translateY: p1.y }] }]} />
          <Animated.View style={[styles.blob, { bottom: height * 0.1, right: -width * 0.1, backgroundColor: colors.accent, opacity: 0.1, transform: [{ translateX: p2.x }, { translateY: p2.y }] }]} />
          <Animated.View style={[styles.blob, { top: height * 0.3, right: -width * 0.3, backgroundColor: colors.purple, opacity: 0.08, width: 400, height: 400, transform: [{ translateX: p3.x }, { translateY: p3.y }] }]} />
        </View>
      )}

      {background && (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {background}
        </View>
      )}

      <Container
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          scroll ? { paddingBottom: 100 } : undefined, // Extra padding for floating bar
          { paddingHorizontal: 20, paddingTop: 64 },
          contentStyle,
        ]}
        style={{ flex: 1 }} 
      >
        {children}
      </Container>
    </View>
  );
}

const styles = StyleSheet.create({
  blob: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
  }
});

