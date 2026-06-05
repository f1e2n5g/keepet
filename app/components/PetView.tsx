import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { Pet } from "@keepet/shared";
import { colors, radius } from "../lib/theme";

// MVP 先用 emoji 表現寵物狀態（開心/普通/餓）；Phase 2 換 Lottie 動畫。
const SKIN_HAT: Record<string, string> = {
  space: "🚀",
  ninja: "🥷",
  crown: "👑",
};

function faceFor(pet: Pet): string {
  if (pet.hunger < 20) return "🫩"; // 很餓
  if (pet.happiness > 75) return "😸"; // 很開心
  if (pet.happiness < 30) return "😿"; // 不開心
  return "🐱";
}

export function PetView({ pet }: { pet: Pet }) {
  const hat = SKIN_HAT[pet.current_skin];
  return (
    <View style={styles.stage}>
      {hat ? <Text style={styles.hat}>{hat}</Text> : null}
      <Text style={styles.pet}>{faceFor(pet)}</Text>
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
