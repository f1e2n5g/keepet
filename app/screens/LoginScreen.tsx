import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Modal,
} from "react-native";
import { useMutation } from "@tanstack/react-query";
import { api, ApiError } from "../lib/api";
import { useSession } from "../lib/session";
import { Button, Card, H1, Muted } from "../components/ui";
import { colors, spacing, radius } from "../lib/theme";
import { PrivacyPolicyScreen } from "./PrivacyPolicyScreen";

export function LoginScreen() {
  const signIn = useSession((s) => s.signIn);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [familyName, setFamilyName] = useState("");
  const [parentName, setParentName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      if (mode === "register") {
        return api.register({
          family_name: familyName,
          parent_name: parentName,
          email,
          password,
        });
      }
      return api.login({ email, password });
    },
    onSuccess: (res) => signIn(res.token, res.user),
    onError: (e) => setError(e instanceof ApiError ? e.message : "發生錯誤，請稍後再試"),
  });

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.logo}>🐾</Text>
        <H1 style={{ textAlign: "center" }}>KeePet</H1>
        <Muted>完成任務、養大你的寵物！</Muted>

        <Card style={{ width: "100%", maxWidth: 420, marginTop: spacing.lg }}>
          <View style={styles.tabs}>
            <TabButton label="登入" active={mode === "login"} onPress={() => setMode("login")} />
            <TabButton
              label="註冊新家庭"
              active={mode === "register"}
              onPress={() => setMode("register")}
            />
          </View>

          {mode === "register" && (
            <>
              <Field label="家庭名稱" value={familyName} onChangeText={setFamilyName} placeholder="小明家" />
              <Field label="家長暱稱" value={parentName} onChangeText={setParentName} placeholder="媽媽" />
            </>
          )}
          <Field
            label="家長 Email"
            value={email}
            onChangeText={setEmail}
            placeholder="parent@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Field
            label="密碼"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••"
            secureTextEntry
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <Button
            label={mode === "register" ? "建立家庭" : "登入"}
            onPress={() => {
              setError(null);
              mutation.mutate();
            }}
            loading={mutation.isPending}
            style={{ marginTop: spacing.md }}
          />
          <Muted>小朋友登入：請家長登入後，在「孩子」頁面把手機交給小朋友。</Muted>
        </Card>

        {/* 隱私政策連結（Play Store 上架必須在登入頁顯示） */}
        <Pressable onPress={() => setShowPrivacy(true)} style={{ marginTop: spacing.lg }}>
          <Text style={styles.privacyLink}>隱私政策</Text>
        </Pressable>
      </ScrollView>

      <Modal visible={showPrivacy} animationType="slide">
        <PrivacyPolicyScreen onBack={() => setShowPrivacy(false)} />
      </Modal>
    </KeyboardAvoidingView>
  );
}

function TabButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Text
      onPress={onPress}
      style={[styles.tab, active && styles.tabActive]}
    >
      {label}
    </Text>
  );
}

function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { label, ...rest } = props;
  return (
    <View style={{ marginVertical: spacing.xs }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        {...rest}
        placeholderTextColor={colors.muted}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.lg, alignItems: "center", paddingTop: 80, minHeight: "100%" },
  logo: { fontSize: 64, textAlign: "center" },
  tabs: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  tab: {
    flex: 1,
    textAlign: "center",
    paddingVertical: 10,
    borderRadius: radius.pill,
    color: colors.muted,
    fontWeight: "700",
    overflow: "hidden",
  },
  tabActive: { backgroundColor: "#FEF3C7", color: colors.primaryDark },
  fieldLabel: { fontWeight: "600", color: colors.text, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: "#fff",
  },
  error: { color: colors.danger, marginTop: spacing.sm, fontWeight: "600" },
  privacyLink: { color: colors.muted, textDecorationLine: "underline", fontSize: 14 },
});
