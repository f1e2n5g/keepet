import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Easing, Platform } from "react-native";
import type { Pet } from "@keepet/shared";
import { colors, radius } from "../lib/theme";

// MVP 用 emoji + Animated 表現寵物：閒置時上下彈跳，開心時跳更快，
// 餵食時放大回彈。Phase 3 之後可把 emoji 換成 Lottie 動畫（介面不變）。
const SKIN_HAT: Record<string, string> = {
  space: "🚀",
  ninja: "🥷",
  crown: "👑",
};

function faceFor(pet: Pet): string {
  if (pet.hunger < 20) return "🙀"; // 很餓
  if (pet.happiness > 75) return "😸"; // 很開心
  if (pet.happiness < 30) return "😿"; // 不開心
  return "🐱";
}

const useDriver = Platform.OS !== "web";

export function PetView({ pet, reactKey }: { pet: Pet; reactKey?: number }) {
  const bounce = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(1)).current;

  // 閒置彈跳：快樂越高跳越快
  useEffect(() => {
    const duration = pet.happiness > 75 ? 500 : pet.happiness < 30 ? 1400 : 850;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, {
          toValue: -1,
          duration,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: useDriver,
        }),
        Animated.timing(bounce, {
          toValue: 0,
          duration,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: useDriver,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bounce, pet.happiness]);

  // 餵食/互動時的放大回彈（reactKey 改變就觸發）
  useEffect(() => {
    if (reactKey === undefined) return;
    pop.setValue(1);
    Animated.sequence([
      Animated.spring(pop, { toValue: 1.25, useNativeDriver: useDriver, speed: 20, bounciness: 14 }),
      Animated.spring(pop, { toValue: 1, useNativeDriver: useDriver, speed: 12, bounciness: 10 }),
    ]).start();
  }, [reactKey, pop]);

  const translateY = bounce.interpolate({ inputRange: [-1, 0], outputRange: [-18, 0] });
  const hat = SKIN_HAT[pet.current_skin];

  return (
    <View style={styles.stage}>
      <Animated.View style={{ alignItems: "center", transform: [{ translateY }, { scale: pop }] }}>
        {hat ? <Text style={styles.hat}>{hat}</Text> : null}
        <Text style={styles.pet}>{faceFor(pet)}</Text>
      </Animated.View>
      <View style={styles.shadow} />
      <Text style={styles.name}>{pet.name}</Text>
      <View style={styles.levelPill}>
        <Text style={styles.levelText}>Lv.{pet.level}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    alignItems: "center",
    paddingVertical: 24,
    backgroundColor: "#FFEDD5",
    borderRadius: radius.lg,
  },
  hat: { fontSize: 36, marginBottom: -12 },
  pet: { fontSize: 110 },
  shadow: {
    width: 90,
    height: 14,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.08)",
    marginTop: 4,
  },
  name: { fontSize: 20, fontWeight: "800", color: colors.text, marginTop: 8 },
  levelPill: {
    marginTop: 6,
    backgroundColor: colors.purple,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  levelText: { color: "#fff", fontWeight: "800" },
});
