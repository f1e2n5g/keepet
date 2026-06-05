import React from "react";
import {
  Text,
  View,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  type ViewStyle,
  type TextStyle,
} from "react-native";
import { colors, radius, spacing } from "../lib/theme";

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled,
  loading,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "success" | "danger" | "ghost";
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}) {
  const bg =
    variant === "success"
      ? colors.accent
      : variant === "danger"
        ? colors.danger
        : variant === "ghost"
          ? "transparent"
          : colors.primary;
  const fg = variant === "ghost" ? colors.primary : "#fff";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        variant === "ghost" && { borderWidth: 2, borderColor: colors.primary },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={[styles.btnText, { color: fg }]}>{label}</Text>
      )}
    </Pressable>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function StatBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <View style={{ marginVertical: spacing.xs }}>
      <View style={styles.statRow}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statLabel}>{Math.round(pct)}%</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

export function PointsBadge({ points }: { points: number }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>⭐ {points}</Text>
    </View>
  );
}

export function H1({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[styles.h1, style]}>{children}</Text>;
}

export function Muted({ children }: { children: React.ReactNode }) {
  return <Text style={styles.muted}>{children}</Text>;
}

const styles = StyleSheet.create({
  btn: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
  },
  btnText: { fontSize: 17, fontWeight: "700" },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  statLabel: { fontSize: 14, fontWeight: "600", color: colors.text },
  track: {
    height: 14,
    backgroundColor: "#F1F1F1",
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: radius.pill },
  badge: {
    backgroundColor: "#FEF3C7",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    alignSelf: "flex-start",
  },
  badgeText: { fontSize: 16, fontWeight: "800", color: colors.primaryDark },
  h1: { fontSize: 26, fontWeight: "800", color: colors.text, marginBottom: spacing.sm },
  muted: { color: colors.muted, fontSize: 14 },
});
