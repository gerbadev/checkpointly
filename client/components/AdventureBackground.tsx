import React, { useEffect, useMemo, useRef } from "react";
import { View, StyleSheet, Dimensions, Animated, Easing } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { getAdventureTheme } from "@/constants/adventureThemes";

type AdventureThemeId = "mountain" | "space" | "forest" | "ocean" | "desert";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function isFish(emoji: string) {
  return emoji.includes("🐟") || emoji.includes("🐠") || emoji.includes("🐡");
}

function isStar(emoji: string) {
  return emoji.includes("✨") || emoji.includes("⭐") || emoji.includes("🌠");
}

const SHOOTING_STARS = Array.from({ length: 12 }).map((_, i) => {
  const seed = (i + 1) * 1337;
  const r1 = (seed % 97) / 97;
  const r2 = (seed % 53) / 53;
  const r3 = (seed % 79) / 79;

  return {
    x0: lerp(-0.45, 0.85, r1),
    y0: lerp(-0.15, 0.90, r2),
    speed: lerp(1.6, 3.0, r3),
    phase: (seed % 100) / 100,
    len: lerp(80, 160, r2),
    thick: lerp(1.6, 2.6, r1),
    opacity: lerp(0.16, 0.30, r3),
  };
});

export function AdventureBackground({ themeId }: { themeId?: AdventureThemeId }) {
  const t = useMemo(() => getAdventureTheme(themeId ?? "mountain"), [themeId]);
  const { width, height } = Dimensions.get("window");

  const blobs = useMemo(
    () => [
      { x: -0.15, y: 0.05, s: width * 0.9, o: 0.18 },
      { x: 0.55, y: 0.18, s: width * 0.75, o: 0.14 },
      { x: 0.12, y: 0.55, s: width * 0.85, o: 0.10 },
    ],
    [width]
  );

  const clock = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    clock.stopAnimation();
    clock.setValue(0);

    const anim = Animated.loop(
      Animated.timing(clock, {
        toValue: 1,
        duration: 18000, 
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    anim.start();
    return () => anim.stop();
  }, [clock, t.id]);

  const blobPhases = useMemo(() => [
    {
      x: clock.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 30, 0] }),
      y: clock.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -40, 0] })
    },
    {
      x: clock.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -40, 0] }),
      y: clock.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 25, 0] })
    },
    {
      x: clock.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 20, 0] }),
      y: clock.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -20, 0] })
    }
  ], [clock]);

  const mistPhase = useMemo(
    () => Animated.modulo(Animated.add(clock, 0.15), 1),
    [clock]
  );

  const mistDrift = useMemo(
    () =>
      mistPhase.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [-18, 18, -18],
      }),
    [mistPhase]
  );

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      <LinearGradient
        colors={[t.bg.from, t.bg.to]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {blobs.map((b, i) => {
        const bp = blobPhases[i % blobPhases.length];
        return (
          <Animated.View
            key={`blob-${t.id}-${i}`}
            style={[
              styles.blob,
              {
                left: width * b.x,
                top: height * b.y,
                width: b.s,
                height: b.s,
                backgroundColor: t.softBg,
                opacity: b.o,
                transform: [
                  { translateX: bp.x },
                  { translateY: bp.y }
                ],
              },
            ]}
          />
        );
      })}

      {t.decor.map((d, i) => {
        const seed = (i + 1) * 997;

        const ampX = isFish(d.emoji) ? 52 : isStar(d.emoji) ? 10 : 10;
        const ampY = isFish(d.emoji) ? 10 : isStar(d.emoji) ? 8 : 8;

        const itemPhase = (seed % 360) / 360; 
        const speed = clamp(((seed % 17) + 6) / 10, 0.6, 2.0);

        const tt = Animated.modulo(
          Animated.add(Animated.multiply(clock, speed), itemPhase),
          1
        );

        const translateX = tt.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [-ampX, ampX, -ampX],
        });

        const translateY = tt.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [-ampY, ampY, -ampY],
        });

        const life = tt.interpolate({
          inputRange: [0, 0.06, 0.18, 0.82, 0.94, 1],
          outputRange: [0, 1, 1, 1, 1, 0],
        });

        const twinkle = tt.interpolate({
          inputRange: [0, 0.2, 0.5, 0.8, 1],
          outputRange: [0.55, 1.0, 0.65, 1.0, 0.55],
        });

        const baseOpacity = d.opacity ?? 0.1;

        const animatedOpacity = isStar(d.emoji)
          ? (Animated.multiply(Animated.multiply(life, twinkle), baseOpacity * 1.5) as any)
          : (Animated.multiply(life, baseOpacity) as any);

        return (
          <Animated.Text
            key={`decor-${t.id}-${i}`}
            style={[
              styles.decor,
              {
                left: width * d.x,
                top: height * d.y,
                fontSize: d.size,
                opacity: animatedOpacity,
                transform: [
                  { translateX },
                  { translateY },
                  { rotate: d.rotate ?? "0deg" },
                ],
              },
            ]}
          >
            {d.emoji}
          </Animated.Text>
        );
      })}

      {t.id === "space" && (
        <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
          {SHOOTING_STARS.map((s, i) => {
            const tt = Animated.modulo(
              Animated.add(Animated.multiply(clock, s.speed), s.phase),
              1
            );

            const travelX = width * 2.1;
            const travelY = height * 0.22;

            const x = Animated.add(width * s.x0, Animated.multiply(tt, travelX));
            const y = Animated.add(height * s.y0, Animated.multiply(tt, travelY));

            const life = tt.interpolate({
              inputRange: [0, 0.08, 0.16, 0.74, 0.86, 1],
              outputRange: [0, 0, 1, 1, 0, 0],
            });

            const shimmer = tt.interpolate({
              inputRange: [0, 0.35, 0.55, 0.8, 1],
              outputRange: [0.85, 1.0, 0.92, 1.0, 0.85],
            });

            const finalOpacity = Animated.multiply(
              Animated.multiply(life, shimmer),
              s.opacity
            ) as any;

            return (
              <Animated.View
                key={`shoot-${i}`}
                style={[
                  styles.shoot,
                  {
                    width: s.len,
                    height: s.thick,
                    backgroundColor: t.accent,
                    opacity: finalOpacity,
                    transform: [
                      { translateX: x as any },
                      { translateY: y as any },
                      { rotate: "8deg" },
                    ],
                  },
                ]}
              />
            );
          })}
        </View>
      )}

      {t.id === "mountain" && (
        <Animated.View
          style={[
            styles.mistLayer,
            {
              transform: [{ translateX: mistDrift as any }],
            },
          ]}
        />
      )}
      <View style={styles.mist} />
    </View>
  );
}

const styles = StyleSheet.create({
  blob: {
    position: "absolute",
    borderRadius: 9999,
  },
  decor: {
    position: "absolute",
  },
  shoot: {
    position: "absolute",
    borderRadius: 999,
    shadowColor: "#ffffff",
    shadowOpacity: 0.22,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  mist: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.10)",
  },
  mistLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.035)",
  },
});
