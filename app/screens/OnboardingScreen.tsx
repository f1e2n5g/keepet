import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Dimensions,
  ScrollView,
} from "react-native";
import { colors, spacing, radius } from "../lib/theme";

const STEPS = [
  {
    emoji: "🐾",
    title: "歡迎來到 KeePet！",
    body: "在這裡，做任務就能養大你的專屬寵物。任務越多、寵物越強！",
  },
  {
    emoji: "📋",
    title: "完成任務賺積分",
    body: "家長會幫你設定任務（刷牙、整理房間…）。完成後點「我完成了」，等家長確認就拿到積分！",
  },
  {
    emoji: "⭐",
    title: "用積分養寵物",
    body: "用積分買食物餵你的寵物，牠會升級、變開心！還能買造型幫牠換裝扮。",
  },
  {
    emoji: "🎁",
    title: "還能換現實獎勵",
    body: "積分除了養寵物，還可以換家長設定的真實獎勵，比如「看電視 30 分鐘」！",
  },
];

const { width } = Dimensions.get("window");

interface Props {
  onDone: () => void;
}

export function OnboardingScreen({ onDone }: Props) {
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;
  const s = STEPS[step];

  return (
    <View style={styles.root}>
      {/* 跳過 */}
      {!isLast && (
        <Pressable style={styles.skip} onPress={onDone}>
          <Text style={styles.skipText}>跳過</Text>
        </Pressable>
      )}

      <View style={styles.center}>
        <Text style={styles.bigEmoji}>{s.emoji}</Text>
        <Text style={styles.title}>{s.title}</Text>
        <Text style={styles.body}>{s.body}</Text>
      </View>

      {/* 點點 */}
      <View style={styles.dots}>
        {STEPS.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === step && styles.dotActive]}
          />
        ))}
      </View>

      {/* 按鈕 */}
      <Pressable
        style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]}
        onPress={() => (isLast ? onDone() : setStep((s) => s + 1))}
      >
        <Text style={styles.btnText}>{isLast ? "開始使用！" : "下一步"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: spacing.lg,
    justifyContent: "space-between",
    maxWidth: 420,
    alignSelf: "center",
    width: "100%",
  },
  skip: {
    alignSelf: "flex-end",
    padding: spacing.sm,
    marginTop: Platform.OS === "ios" ? 40 : spacing.md,
  },
  skipText: { color: colors.muted, fontWeight: "700" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: spacing.md },
  bigEmoji: { fontSize: 96, textAlign: "center" },
  title: {
    fontSize: 26,
    fontWeight: "900",
    color: colors.text,
    textAlign: "center",
  },
  body: {
    fontSize: 17,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 26,
    paddingHorizontal: spacing.md,
  },
  dots: { flexDirection: "row", justifyContent: "center", gap: spacing.sm, paddingVertical: spacing.md },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: { backgroundColor: colors.primary, width: 24 },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: 18,
    alignItems: "center",
    marginBottom: Platform.OS === "ios" ? 40 : spacing.lg,
  },
  btnText: { color: "#fff", fontWeight: "900", fontSize: 18 },
});
