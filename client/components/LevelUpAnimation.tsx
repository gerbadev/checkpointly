import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useThemeColors } from '@/state/UserPreferencesContext';

export type LevelUpPayload = {
  newLevel: number;
  currentXp: number;
  nextLevelXp: number;
  totalXp: number;
};

type Props = {
  visible: boolean;
  payload: LevelUpPayload | null;
  onDone: () => void;
};

export function LevelUpAnimation({ visible, payload, onDone }: Props) {
  const colors = useThemeColors();
  
  // Animation values
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.5)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const sparkleScale = useRef(new Animated.Value(0)).current;
  const levelTextScale = useRef(new Animated.Value(0)).current;
  const xpBarWidth = useRef(new Animated.Value(0)).current;
  const sparkleRotation = useRef(new Animated.Value(0)).current;

  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    let timeout: any;

    async function runAnimation() {
      if (!visible || !payload) return;

      // Haptic feedback
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}

      // Reset all animations
      overlayOpacity.setValue(0);
      cardScale.setValue(0.5);
      cardOpacity.setValue(0);
      glowOpacity.setValue(0);
      sparkleScale.setValue(0);
      levelTextScale.setValue(0);
      xpBarWidth.setValue(0);
      sparkleRotation.setValue(0);

      // Phase 1: Fade in overlay and glow
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();

      // Phase 2: Card entrance with bounce
      setTimeout(() => {
        Animated.parallel([
          Animated.spring(cardScale, {
            toValue: 1,
            friction: 6,
            tension: 40,
            useNativeDriver: true,
          }),
          Animated.timing(cardOpacity, {
            toValue: 1,
            duration: 300,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]).start();
      }, 200);

      // Phase 3: Sparkles and level text
      setTimeout(() => {
        Animated.parallel([
          Animated.spring(sparkleScale, {
            toValue: 1,
            friction: 8,
            tension: 60,
            useNativeDriver: true,
          }),
          Animated.spring(levelTextScale, {
            toValue: 1,
            friction: 6,
            tension: 50,
            useNativeDriver: true,
          }),
          Animated.loop(
            Animated.timing(sparkleRotation, {
              toValue: 1,
              duration: 2000,
              easing: Easing.linear,
              useNativeDriver: true,
            }),
            { iterations: -1 }
          ),
        ]).start();
      }, 600);

      // Phase 4: XP bar animation
      setTimeout(() => {
        Animated.timing(xpBarWidth, {
          toValue: 1,
          duration: 800,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }).start();
      }, 1000);

      // Phase 5: Auto-dismiss
      timeout = setTimeout(() => {
        Animated.parallel([
          Animated.timing(overlayOpacity, {
            toValue: 0,
            duration: 300,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(cardOpacity, {
            toValue: 0,
            duration: 300,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(glowOpacity, {
            toValue: 0,
            duration: 300,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
        ]).start(({ finished }) => {
          if (finished) onDoneRef.current?.();
        });
      }, 3500);
    }

    runAnimation();
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [visible, payload, overlayOpacity, cardScale, cardOpacity, glowOpacity, sparkleScale, levelTextScale, xpBarWidth, sparkleRotation]);

  if (!visible || !payload) return null;

  const sparkleRotationDeg = sparkleRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View pointerEvents="none" style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
        {/* Glow effect */}
        <Animated.View
          style={[
            styles.glow,
            {
              opacity: glowOpacity,
              backgroundColor: colors.primary + '20',
              borderColor: colors.primary + '40',
            },
          ]}
        />

        {/* Main card */}
        <Animated.View
          style={[
            styles.card,
            {
              opacity: cardOpacity,
              transform: [{ scale: cardScale }],
              backgroundColor: colors.surface,
              borderColor: colors.primary + '60',
            },
          ]}
        >
          {/* Sparkles */}
          <Animated.View
            style={[
              styles.sparkle1,
              {
                transform: [
                  { scale: sparkleScale },
                  { rotate: sparkleRotationDeg },
                ],
              },
            ]}
          >
            <Text style={[styles.sparkle, { color: colors.primary }]}>✨</Text>
          </Animated.View>
          <Animated.View
            style={[
              styles.sparkle2,
              {
                transform: [
                  { scale: sparkleScale },
                  { rotate: sparkleRotationDeg },
                ],
              },
            ]}
          >
            <Text style={[styles.sparkle, { color: colors.accent }]}>⭐</Text>
          </Animated.View>
          <Animated.View
            style={[
              styles.sparkle3,
              {
                transform: [
                  { scale: sparkleScale },
                  { rotate: sparkleRotationDeg },
                ],
              },
            ]}
          >
            <Text style={[styles.sparkle, { color: colors.primary }]}>🌟</Text>
          </Animated.View>

          {/* Level text */}
          <Animated.View
            style={[
              styles.levelContainer,
              { transform: [{ scale: levelTextScale }] },
            ]}
          >
            <Text style={[styles.levelUpText, { color: colors.primary }]}>LEVEL UP!</Text>
            <Text style={[styles.levelNumber, { color: colors.text }]}>
              Level {payload.newLevel}
            </Text>
          </Animated.View>

          {/* XP Progress */}
          <View style={styles.xpContainer}>
            <Text style={[styles.xpText, { color: colors.muted }]}>
              {payload.currentXp} / {payload.nextLevelXp} XP
            </Text>
            <View style={[styles.xpBarBg, { backgroundColor: colors.glass }]}>
              <Animated.View
                style={[
                  styles.xpBar,
                  {
                    backgroundColor: colors.primary,
                    width: xpBarWidth.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
            <Text style={[styles.totalXpText, { color: colors.faint }]}>
              Ukupno: {payload.totalXp} XP
            </Text>
          </View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  glow: {
    position: 'absolute',
    left: -30,
    right: -30,
    top: -30,
    bottom: -30,
    borderRadius: 40,
    borderWidth: 2,
  },
  card: {
    width: '85%',
    maxWidth: 360,
    borderRadius: 24,
    padding: 24,
    borderWidth: 2,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  sparkle1: {
    position: 'absolute',
    top: -10,
    left: 20,
  },
  sparkle2: {
    position: 'absolute',
    top: -5,
    right: 25,
  },
  sparkle3: {
    position: 'absolute',
    bottom: 20,
    left: 15,
  },
  sparkle: {
    fontSize: 24,
  },
  levelContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  levelUpText: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 8,
    letterSpacing: 1,
  },
  levelNumber: {
    fontSize: 32,
    fontWeight: '900',
  },
  xpContainer: {
    width: '100%',
    alignItems: 'center',
  },
  xpText: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  xpBarBg: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  xpBar: {
    height: '100%',
    borderRadius: 4,
  },
  totalXpText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
