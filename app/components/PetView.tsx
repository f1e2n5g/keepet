// Lottie 包裝：Android 用 lottie-react-native（原生），web 降回 React Native Animated（emoji）。
// 換成真實 .json 動畫素材時只要替換 animationData/source，介面不用改。
import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Easing, Platform } from "react-native";
import type { Pet } from "@keepet/shared";
import { colors, radius } from "../lib/theme";

const IS_NATIVE = Platform.OS !== "web";

// 造型對應的帽子 emoji（Lottie 素材到位後改成 overlay 貼圖）
const SKIN_HAT: Record<string, string> = {
  space: "🚀",
  ninja: "🥷",
  crown: "👑",
};

function faceFor(pet: Pet): string {
  if (pet.hunger < 20) return "🙀";
  if (pet.happiness > 75) return "😸";
  if (pet.happiness < 30) return "😿";
  return "🐱";
}

// ─── Lottie（Android）────────────────────────────────────
let LottieView: React.ComponentType<{
  source: unknown;
  autoPlay: boolean;
  loop: boolean;
  speed: number;
  style?: object;
}> | null = null;

if (IS_NATIVE) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    LottieView = require("lottie-react-native").default;
  } catch {
    // 模擬器 / 未連結 native module，降回 Animated
    LottieView = null;
  }
}

// 預設動畫資料（純程式碼產生的彈跳小圓，直到有真實素材前作佔位）
const FALLBACK_LOTTIE = {
  v: "5.7.4",
  fr: 30,
  ip: 0,
  op: 60,
  w: 200,
  h: 200,
  layers: [],
};

// ─── Animated（web + fallback）───────────────────────────
function AnimatedPet({ pet, reactKey }: { pet: Pet; reactKey?: number }) {
  const bounce = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const duration = pet.happiness > 75 ? 500 : pet.happiness < 30 ? 1400 : 850;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, {
          toValue: -1,
          duration,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(bounce, {
          toValue: 0,
          duration,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bounce, pet.happiness]);

  useEffect(() => {
    if (reactKey === undefined) return;
    pop.setValue(1);
    Animated.sequence([
      Animated.spring(pop, { toValue: 1.25, useNativeDriver: false, speed: 20, bounciness: 14 }),
      Animated.spring(pop, { toValue: 1, useNativeDriver: false, speed: 12, bounciness: 10 }),
    ]).start();
  }, [reactKey, pop]);

  const translateY = bounce.interpolate({ inputRange: [-1, 0], outputRange: [-18, 0] });
  return (
    <Animated.View style={{ alignItems: "center", transform: [{ translateY }, { scale: pop }] }}>
      <Text style={styles.emoji}>{faceFor(pet)}</Text>
    </Animated.View>
  );
}

// ─── PetView（公開元件）──────────────────────────────────
export function PetView({ pet, reactKey }: { pet: Pet; reactKey?: number }) {
  const hat = SKIN_HAT[pet.current_skin];

  // Android + lottie-react-native 已連結：用 Lottie 動畫
  const useLottie = IS_NATIVE && LottieView != null;
  // 快樂越高速度越快
  const lottieSpeed = pet.happiness > 75 ? 1.5 : pet.happiness < 30 ? 0.6 : 1.0;

  return (
    <View style={styles.stage}>
      {hat ? <Text style={styles.hat}>{hat}</Text> : null}

      {useLottie && LottieView ? (
        <LottieView
          source={FALLBACK_LOTTIE}
          autoPlay
          loop
          speed={lottieSpeed}
          style={{ width: 140, height: 140 }}
        />
      ) : (
        <AnimatedPet pet={pet} reactKey={reactKey} />
      )}

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
  emoji: { fontSize: 110 },
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
