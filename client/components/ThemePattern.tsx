import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Dimensions, StyleSheet, Text, View } from "react-native";

type Kind = "mountain" | "space" | "forest" | "ocean" | "desert";

export function ThemePattern({
  kind,
  color,
}: {
  kind: Kind;
  color: string;
}) {
  if (kind === "ocean") return <OceanFish />;
  if (kind === "space") return <ShootingStars tint={color} />;
  return null;
}

function OceanFish() {
  const { width, height } = Dimensions.get("window");

  const fishes = useMemo(
    () => [
      { emoji: "🐟", y: 0.22, size: 28, opacity: 0.10, dur: 12000, delay: 0 },
      { emoji: "🐠", y: 0.42, size: 34, opacity: 0.10, dur: 16000, delay: 1200 },
      { emoji: "🐡", y: 0.62, size: 30, opacity: 0.08, dur: 18000, delay: 2200 },
      { emoji: "🐟", y: 0.78, size: 26, opacity: 0.07, dur: 20000, delay: 800 },
    ],
    []
  );

  const anims = useRef(fishes.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const loops = anims.map((a, idx) => {
      a.setValue(0);
      const { dur, delay } = fishes[idx];
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(a, {
            toValue: 1,
            duration: dur,
            useNativeDriver: true,
          }),
        ])
      );
    });

    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [anims, fishes]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {fishes.map((f, i) => {
        const x = anims[i].interpolate({
          inputRange: [0, 1],
          outputRange: [-width * 0.2, width * 1.2],
        });
        const drift = anims[i].interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0, -8, 0],
        });

        return (
          <Animated.View
            key={`fish-${i}`}
            style={[
              styles.float,
              {
                top: height * f.y,
                transform: [{ translateX: x }, { translateY: drift }],
                opacity: f.opacity,
              },
            ]}
          >
            <Text style={{ fontSize: f.size }}>{f.emoji}</Text>
          </Animated.View>
        );
      })}
    </View>
  );
}

function ShootingStars({ tint }: { tint: string }) {
  const { width, height } = Dimensions.get("window");

  const a1 = useRef(new Animated.Value(0)).current;
  const a2 = useRef(new Animated.Value(0)).current;
  const a3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const run = (a: Animated.Value, delay: number, startX: number, startY: number) => {
      const seq = () => {
        a.setValue(0);
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(a, { toValue: 1, duration: 900, useNativeDriver: true }),
          Animated.delay(2600), 
        ]).start(() => seq());
      };
      seq();

      return { startX, startY };
    };

    const s1 = run(a1, 800, width * 0.2, height * 0.12);
    const s2 = run(a2, 1800, width * 0.55, height * 0.18);
    const s3 = run(a3, 2600, width * 0.75, height * 0.10);

    return () => {
      a1.stopAnimation();
      a2.stopAnimation();
      a3.stopAnimation();
    };
  }, [a1, a2, a3, width, height]);

  const renderStar = (a: Animated.Value, key: string, sx: number, sy: number) => {
    const tx = a.interpolate({ inputRange: [0, 1], outputRange: [0, width * 0.35] });
    const ty = a.interpolate({ inputRange: [0, 1], outputRange: [0, height * 0.25] });
    const op = a.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.18, 0] });
    const sc = a.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.1] });

    return (
      <Animated.View
        key={key}
        pointerEvents="none"
        style={[
          styles.float,
          {
            left: sx,
            top: sy,
            opacity: op,
            transform: [{ translateX: tx }, { translateY: ty }, { scale: sc }, { rotate: "20deg" }],
          },
        ]}
      >
        <Text style={{ fontSize: 18, color: tint }}>✦</Text>
        <Text style={{ fontSize: 12, color: tint, marginLeft: 2, opacity: 0.7 }}>✦</Text>
      </Animated.View>
    );
  };

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {renderStar(a1, "s1", width * 0.18, height * 0.10)}
      {renderStar(a2, "s2", width * 0.52, height * 0.16)}
      {renderStar(a3, "s3", width * 0.74, height * 0.08)}
    </View>
  );
}

const styles = StyleSheet.create({
  float: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
  },
});
