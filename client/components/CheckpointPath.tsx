import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  Modal,
  Animated,
  Easing,
} from "react-native";
import Svg, { Path, Line } from "react-native-svg";
import { theme } from "@/constants/theme";
import { getAdventureTheme } from "@/constants/adventureThemes";
import { useThemeColors, usePreferences } from "@/state/UserPreferencesContext";

export type Checkpoint = {
  id: string;
  title: string;
  notes?: string;
  completed: boolean;
  skipped?: boolean;
};

type AdventureThemeId = "mountain" | "space" | "forest" | "ocean" | "desert";

type Props = {
  checkpoints: Checkpoint[];
  currentIndex: number | null;

  onComplete: (id: string) => void;
  onUncomplete: (id: string) => void;
  onSkip: (id: string) => void;
  onRegenerate: (id: string) => void;

  regeneratingId: string | null;

  themeId?: AdventureThemeId;

  onActiveY?: (y: number) => void;
};

type Point = { x: number; y: number };
type Cubic = { a: Point; c1: Point; c2: Point; b: Point; len: number };

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function cubicAt(a: Point, c1: Point, c2: Point, b: Point, t: number): Point {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;

  const x =
    a.x * mt2 * mt +
    3 * c1.x * mt2 * t +
    3 * c2.x * mt * t2 +
    b.x * t2 * t;

  const y =
    a.y * mt2 * mt +
    3 * c1.y * mt2 * t +
    3 * c2.y * mt * t2 +
    b.y * t2 * t;

  return { x, y };
}

function approxCubicLength(a: Point, c1: Point, c2: Point, b: Point, steps = 24) {
  let len = 0;
  let prev = a;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const p = cubicAt(a, c1, c2, b, t);
    const dx = p.x - prev.x;
    const dy = p.y - prev.y;
    len += Math.hypot(dx, dy);
    prev = p;
  }
  return len;
}

function bezierControls(a: Point, b: Point, bend: number) {
  const midY = (a.y + b.y) / 2;
  const c1 = { x: a.x, y: midY - bend };
  const c2 = { x: b.x, y: midY + bend };
  return { c1, c2 };
}

export function CheckpointPath({
  checkpoints,
  currentIndex,
  onComplete,
  onUncomplete,
  onSkip,
  onRegenerate,
  regeneratingId,
  themeId,          
  onActiveY,
}: Props) {
  const { width, height } = Dimensions.get("window");
  // The user requested that the adventure details always use default Dark Mode styling
  const isDark = true;
  const colors = theme.modes.dark;

  const advTheme = useMemo(() => getAdventureTheme((themeId ?? "mountain") as any), [themeId]);
  const ACCENT = advTheme.accent;      
  const ACCENT_SOFT = advTheme.softBg; 
  const ACCENT_BORDER = advTheme.border; 

  const topPad = 16;
  const bottomPad = 140;
  const stepY = 152;

  const baseNode = 74;
  const baseRing = 106;

  const milestoneNode = 86;
  const milestoneRing = 120;

  const centerX = width / 2;
  const offsetX = clamp(width * 0.23, 84, 126);
  const leftX = centerX - offsetX;
  const rightX = centerX + offsetX;

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = useMemo(() => {
    if (!selectedId) return null;
    return checkpoints.find((c) => c.id === selectedId) ?? null;
  }, [selectedId, checkpoints]);

  useEffect(() => {
    if (!selectedId) return;
    const stillExists = checkpoints.some((c) => c.id === selectedId);
    if (!stillExists) setSelectedId(null);
  }, [checkpoints, selectedId]);

  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const points = useMemo<Point[]>(() => {
    return checkpoints.map((_, i) => ({
      x: i % 2 === 0 ? leftX : rightX,
      y: topPad + i * stepY,
    }));
  }, [checkpoints, leftX, rightX, topPad, stepY]);

  useEffect(() => {
    if (!onActiveY) return;
    const idx = currentIndex ?? 0;
    const p = points[idx];
    if (p) onActiveY(p.y);
  }, [onActiveY, currentIndex, points]);

  function isMilestone(i: number) {
    return i > 0 && i % 5 === 4;
  }

  function sizeForIndex(i: number) {
    const ms = isMilestone(i);
    const node = ms ? milestoneNode : baseNode;
    const ring = ms ? milestoneRing : baseRing;
    return { node, ring, ringR: ring / 2, nodeR: node / 2, ms };
  }

  const svgHeight = useMemo(() => {
    const maxRingR = milestoneRing / 2;
    return topPad + (checkpoints.length - 1) * stepY + bottomPad + maxRingR;
  }, [checkpoints.length]);

  const { pathD, totalLen, cumLenToIndex } = useMemo(() => {
    if (points.length < 2) return { pathD: "", totalLen: 0, cumLenToIndex: [0] };

    let d = `M ${points[0].x} ${points[0].y}`;
    const cum: number[] = new Array(points.length).fill(0);

    let acc = 0;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1];
      const b = points[i];
      const bend = (i % 2 === 0 ? -1 : 1) * 50;
      const { c1, c2 } = bezierControls(a, b, bend);

      d += ` C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${b.x} ${b.y}`;

      const len = approxCubicLength(a, c1, c2, b, 26);
      acc += len;
      cum[i] = acc;
    }

    return { pathD: d, totalLen: acc, cumLenToIndex: cum };
  }, [points]);

  function lockedAt(index: number) {
    if (currentIndex === null) return index !== 0;
    return index > currentIndex;
  }

  function themeFor(cp: Checkpoint, index: number) {
    const active = currentIndex === index;
    const locked = lockedAt(index);
    const completed = cp.completed;
    const skipped = !!cp.skipped;

    if (completed) {
      return {
        fill: "rgba(54,211,153,0.26)",
        border: "rgba(54,211,153,0.75)",
        inner: "rgba(54,211,153,0.16)",
        glyph: "✓",
        dashed: false,
        lockBadge: false,
        glyphOpacity: 1,
      };
    }

    if (skipped) {
      return {
        fill: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.05)",
        border: isDark ? "rgba(255,255,255,0.26)" : "rgba(0,0,0,0.12)",
        inner: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.03)",
        glyph: "↷",
        dashed: false,
        lockBadge: false,
        glyphOpacity: 1,
      };
    }

    if (active) {
      return {
        fill: ACCENT_SOFT,
        border: ACCENT_BORDER,
        inner: isDark ? "rgba(0,0,0,0.18)" : "rgba(0,0,0,0.05)",
        glyph: "▶",
        dashed: false,
        lockBadge: false,
        glyphOpacity: 1,
      };
    }

    if (locked) {
      return {
        fill: isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.04)",
        border: isDark ? "rgba(255,255,255,0.26)" : "rgba(0,0,0,0.14)",
        inner: isDark ? "rgba(0,0,0,0.18)" : "rgba(0,0,0,0.05)",
        glyph: "•",
        dashed: true,
        lockBadge: true,
        glyphOpacity: 0.55,
      };
    }

    return {
      fill: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.06)",
      border: isDark ? "rgba(255,255,255,0.26)" : "rgba(0,0,0,0.12)",
      inner: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.03)",
      glyph: "•",
      dashed: false,
      lockBadge: false,
      glyphOpacity: 0.9,
    };
  }

  const canOpen = (cp: Checkpoint, index: number) => {
    const active = currentIndex === index;
    const locked = lockedAt(index);
    return active || cp.completed || !!cp.skipped || !locked;
  };

  const progressEndIndex = useMemo(() => {
    let maxDone = -1;
    checkpoints.forEach((c, i) => {
      if (c.completed || c.skipped) maxDone = Math.max(maxDone, i);
    });
    const active = currentIndex ?? 0;
    return clamp(Math.max(maxDone, active), 0, checkpoints.length - 1);
  }, [checkpoints, currentIndex]);

  const progressLen = useMemo(() => {
    if (!totalLen) return 0;
    return cumLenToIndex[progressEndIndex] ?? 0;
  }, [totalLen, cumLenToIndex, progressEndIndex]);

  const labelWidth = 214;
  const labelHeight = 58;
  const labelGap = 10;

  const connectors = useMemo(() => {
    return checkpoints.map((_, i) => {
      const p = points[i];
      const { ringR } = sizeForIndex(i);
      const labelOnRight = i % 2 === 0;

      const labelX = labelOnRight
        ? p.x + ringR + labelGap
        : p.x - ringR - labelGap - labelWidth;
      const labelY = p.y - labelHeight / 2;

      const x1 = labelOnRight ? p.x + ringR - 10 : p.x - ringR + 10;
      const y1 = p.y;
      const x2 = labelOnRight ? labelX + 10 : labelX + labelWidth - 10;
      const y2 = p.y;

      return { labelX, labelY, x1, y1, x2, y2 };
    });
  }, [checkpoints, points]);

  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.6] });
  const fogPoints = useMemo(() => {
  if (themeId !== "mountain") return [];
  const arr: { x: number; y: number; size: number; opacity: number }[] = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;

    const wiggle = i % 2 === 0 ? -14 : 10;

    arr.push({
      x: mx,
      y: my + wiggle,
      size: i % 3 === 0 ? 46 : 40,
      opacity: 0.07,
    });
  }
  return arr;
}, [points, themeId]);

  return (
    <View style={[styles.container, { height: svgHeight }]}>
      <Svg width={width} height={svgHeight} style={StyleSheet.absoluteFill}>
        <Path d={pathD} stroke={isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.06)"} strokeWidth={10} strokeLinecap="round" fill="none" />
        <Path d={pathD} stroke={isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)"} strokeWidth={4} strokeLinecap="round" fill="none" />

        {totalLen > 0 && progressLen > 0 && (
          <>
            <Path
              d={pathD}
              stroke={ACCENT_SOFT}
              strokeWidth={14}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={[progressLen, Math.max(1, totalLen)]}
              strokeDashoffset={0}
            />
            <Path
              d={pathD}
              stroke={ACCENT}
              strokeWidth={4}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={[progressLen, Math.max(1, totalLen)]}
              strokeDashoffset={0}
            />
          </>
        )}
      </Svg>

      <Svg width={width} height={svgHeight} style={StyleSheet.absoluteFill}>
        {connectors.map((c, i) => (
          <React.Fragment key={`c-${i}`}>
            <Line x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2} stroke={isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.08)"} strokeWidth={2} />
            <Line x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2} stroke={ACCENT_SOFT} strokeWidth={1} />
          </React.Fragment>
        ))}
      </Svg>
{themeId === "mountain" &&
  fogPoints.map((f, idx) => (
    <View
      key={`fog-${idx}`}
      pointerEvents="none"
      style={{
        position: "absolute",
        left: f.x - 30,
        top: f.y - 22,
        opacity: f.opacity,
        transform: [{ rotate: idx % 2 === 0 ? "-8deg" : "8deg" }],
      }}
    >
      <Text style={{ fontSize: f.size }}>🌫️</Text>
    </View>
  ))}

      {checkpoints.map((cp, i) => {
        const p = points[i];
        const active = currentIndex === i;
        const locked = lockedAt(i);
        const t = themeFor(cp, i);
        const { node, ring, ringR } = sizeForIndex(i);
        const inner = node - 20;

        const wrapLeft = p.x - ringR;
        const wrapTop = p.y - ringR;
        const canTap = canOpen(cp, i);
        const c = connectors[i];

        return (
          <View
            key={cp.id}
            style={[
              styles.ringWrap,
              { left: wrapLeft, top: wrapTop, width: ring, height: ring },
            ]}
          >
            {active && (
              <Animated.View
                style={[
                  styles.activeRing,
                  {
                    width: ring,
                    height: ring,
                    opacity: pulseOpacity as any,
                    transform: [{ scale: pulseScale as any }],
                    borderColor: ACCENT_BORDER,
                    backgroundColor: ACCENT_SOFT,
                  },
                ]}
              />
            )}

            <Pressable
              onPress={() => {
                if (canTap) setSelectedId(cp.id);
              }}
              disabled={!canTap}
              hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
              style={[styles.hitArea, { width: ring, height: ring }]}
            >
              {active && (
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.activeRing,
                    {
                      width: ring,
                      height: ring,
                      opacity: pulseOpacity as any,
                      transform: [{ scale: pulseScale as any }],
                      borderColor: ACCENT_BORDER,
                      backgroundColor: ACCENT_SOFT,
                    },
                  ]}
                />
              )}

              <View
                pointerEvents="none"
                style={[
                  styles.node,
                  {
                    width: node,
                    height: node,
                    borderColor: t.border,
                    backgroundColor: t.fill,
                    borderStyle: t.dashed ? "dashed" : "solid",
                    opacity: canTap ? 1 : 0.72,
                  },
                ]}
              >
                <View
                  pointerEvents="none"
                  style={[
                    styles.nodeInner,
                    {
                      width: inner,
                      height: inner,
                      borderRadius: 999,
                      backgroundColor: t.inner,
                      left: (node - inner) / 2,
                      top: (node - inner) / 2,
                    },
                  ]}
                />

                <Text pointerEvents="none" style={[styles.glyph, { color: colors.text, opacity: t.glyphOpacity }]}>
                  {t.glyph}
                </Text>

                {t.lockBadge && !active && (
                  <View pointerEvents="none" style={[styles.lockBadge, { backgroundColor: colors.glassStrong, borderColor: colors.glassBorder }]}>
                    <Text style={{ fontSize: 12 }}>🔒</Text>
                  </View>
                )}
              </View>
            </Pressable>

            <View
              pointerEvents="none"
              style={[
                styles.label,
                {
                  width: labelWidth,
                  height: labelHeight,
                  left: c.labelX - wrapLeft,
                  top: c.labelY - wrapTop,
                  borderColor: colors.glassBorder,
                  backgroundColor: colors.glassStrong,
                },
              ]}
            >
              <Text numberOfLines={1} style={[styles.labelTitle, { color: colors.text }]}>
                {cp.title}
              </Text>
              <Text style={[styles.labelMeta, { color: colors.muted }]}>
                {cp.completed
                  ? "Dovršeno"
                  : cp.skipped
                  ? "Preskočeno"
                  : active
                  ? "Aktivno"
                  : locked
                  ? "Zaključano"
                  : "Dostupno"}
              </Text>
            </View>
          </View>
        );
      })}

      <Modal
        visible={!!selectedId}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedId(null)}
      >
        <Pressable style={styles.backdrop} onPress={() => setSelectedId(null)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.glassBorder }]} onPress={() => {}}>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>{selected?.title}</Text>
            <Text style={[styles.sheetNotes, { color: colors.muted }]}>
              {selected?.notes || "Nema dodatnih uputa za ovu točku."}
            </Text>

            {selected && (
              <View style={{ marginTop: 14, gap: 10 }}>
                {(() => {
                  const idx = checkpoints.findIndex((c) => c.id === selected.id);
                  const active = currentIndex === idx;
                  const completed = selected.completed;
                  const skipped = !!selected.skipped;
                  const locked = idx >= 0 ? lockedAt(idx) : true;
                  const regen = regeneratingId === selected.id;

                  if (locked && !active && !completed && !skipped) {
                    return (
                      <Text style={{ color: colors.muted, lineHeight: 20 }}>
                        Ova točka je zaključana. Dovrši prethodnu kako bi je otključao.
                      </Text>
                    );
                  }

                  return (
                    <>
                      {active && !completed && !skipped && !regen && (
                        <>
                          <Pressable
                            style={[styles.primaryBtn, { backgroundColor: ACCENT }]} 
                            onPress={() => {
                              onComplete(selected.id);
                              setSelectedId(null);
                            }}
                          >
                            <Text style={styles.primaryBtnText}>Dovrši točku</Text>
                          </Pressable>

                          <Pressable
                            style={styles.secondaryBtn}
                            onPress={() => {
                              onSkip(selected.id);
                              setSelectedId(null);
                            }}
                          >
                            <Text style={styles.primaryBtnText}>Preskoči</Text>
                          </Pressable>
                        </>
                      )}

                      {skipped && !completed && !regen && (
                        <Pressable
                          style={[styles.primaryBtn, { backgroundColor: ACCENT }]} 
                          onPress={() => {
                            onComplete(selected.id);
                            setSelectedId(null);
                          }}
                        >
                          <Text style={styles.primaryBtnText}>Dovrši točku</Text>
                        </Pressable>
                      )}

                      {completed && !regen && (
                        <Pressable
                          style={[styles.secondaryBtn, { backgroundColor: colors.glassStrong, borderColor: colors.glassBorder }]}
                          onPress={() => {
                            onUncomplete(selected.id);
                            setSelectedId(null);
                          }}
                        >
                          <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Poništi dovršavanje</Text>
                        </Pressable>
                      )}

                      {active && !completed && (
                        <Pressable
                          style={styles.ghostBtn}
                          disabled={regen}
                          onPress={() => onRegenerate(selected.id)}
                        >
                          <Text style={[styles.ghostBtnText, { color: colors.muted }]}>
                            {regen ? "Regeneriranje…" : "Regeneriraj točku"}
                          </Text>
                        </Pressable>
                      )}
                    </>
                  );
                })()}
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: "relative", width: "100%" },

  ringWrap: {
    position: "absolute",
    zIndex: 10,
  },

  hitArea: {
    position: "absolute",
    left: 0,
    top: 0,
    alignItems: "center",
    justifyContent: "center",
  },

  node: {
    borderRadius: 999,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.26,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
  },

  nodeInner: {
    position: "absolute",
  },

  glyph: {
    fontSize: 18,
    fontWeight: "900",
  },

  activeRing: {
    position: "absolute",
    borderRadius: 999,
    borderWidth: 2,
  },

  lockBadge: {
    position: "absolute",
    right: -7,
    top: -7,
    width: 30,
    height: 30,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.20)",
  },

  label: {
    position: "absolute",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: "center",
  },
  labelTitle: {
    fontWeight: "900",
    fontSize: 13,
  },
  labelMeta: {
    marginTop: 4,
    fontWeight: "800",
    fontSize: 11,
  },

  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    padding: 16,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: "rgba(20,20,35,0.96)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  sheetTitle: { fontWeight: "900", fontSize: 16 },
  sheetNotes: {
    marginTop: 10,
    lineHeight: 20,
    fontSize: 12,
  },

  primaryBtn: {
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: { color: "#fff", fontWeight: "900" },

  secondaryBtn: {
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  secondaryBtnText: { fontWeight: "800" },

  ghostBtn: { paddingVertical: 10, borderRadius: 999, alignItems: "center" },
  ghostBtnText: { fontWeight: "900" },
});
