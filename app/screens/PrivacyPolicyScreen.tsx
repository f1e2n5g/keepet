import React from "react";
import { View, Text, ScrollView, StyleSheet, Pressable } from "react-native";
import { colors, spacing, radius } from "../lib/theme";

const SECTIONS = [
  {
    title: "我們蒐集哪些資料？",
    body: `我們只蒐集讓服務運作所需的最少資料：
• 家長的 Email 與密碼（加密儲存，用於帳號登入）
• 小朋友的名字與頭像（由家長建立，不蒐集個資）
• 任務完成紀錄與積分流水帳
• 您選擇開啟推播通知時的裝置 Token

我們不蒐集：位置、聯絡人、麥克風/相機、真實姓名、就讀學校、或任何兒童個人資料。`,
  },
  {
    title: "資料如何使用？",
    body: `所有資料只用於提供 KeePet 核心功能（任務管理、積分計算、寵物養成），不會用於：
• 行為廣告或行銷
• 販售給第三方
• 分析或追蹤您的裝置`,
  },
  {
    title: "資料儲存與安全",
    body: `資料儲存於 Cloudflare 的全球邊緣資料中心，傳輸全程使用 TLS 加密。密碼以單向雜湊儲存，我們無法還原您的密碼。`,
  },
  {
    title: "兒童隱私（COPPA）",
    body: `KeePet 設計為由家長代為管理小朋友的帳號，不直接向 13 歲以下兒童蒐集個人資料。小朋友帳號由家長建立，不需提供電子郵件或真實姓名。

若您認為我們誤蒐集了兒童個資，請聯繫我們，我們將立即刪除。`,
  },
  {
    title: "您的資料權利",
    body: `您可以隨時：
• 在 App 內刪除小朋友帳號及其全部資料
• 聯繫我們要求刪除家長帳號及所有相關資料
• 要求匯出您的資料`,
  },
  {
    title: "聯絡我們",
    body: `如有隱私相關問題，請聯繫：privacy@keepet.app`,
  },
];

interface Props {
  onBack?: () => void;
}

export function PrivacyPolicyScreen({ onBack }: Props) {
  return (
    <View style={styles.root}>
      <View style={styles.header}>
        {onBack && (
          <Pressable onPress={onBack} style={styles.back}>
            <Text style={styles.backText}>← 返回</Text>
          </Pressable>
        )}
        <Text style={styles.title}>隱私政策</Text>
        <Text style={styles.updated}>最後更新：2025 年 1 月</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>
          KeePet 是一款讓小朋友透過完成任務養成寵物的親子 App。我們非常重視您和孩子的隱私。
        </Text>

        {SECTIONS.map((s) => (
          <View key={s.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{s.title}</Text>
            <Text style={styles.sectionBody}>{s.body}</Text>
          </View>
        ))}

        <Text style={styles.footer}>
          本政策適用於 KeePet 的 Android App 及網頁版。使用本服務即表示您同意本政策。
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { padding: spacing.lg, paddingTop: spacing.xl, borderBottomWidth: 1, borderBottomColor: colors.border },
  back: { marginBottom: spacing.sm },
  backText: { color: colors.primary, fontWeight: "700", fontSize: 16 },
  title: { fontSize: 26, fontWeight: "900", color: colors.text },
  updated: { fontSize: 13, color: colors.muted, marginTop: 4 },
  body: { padding: spacing.lg, gap: spacing.lg },
  intro: { fontSize: 16, color: colors.muted, lineHeight: 24 },
  section: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: colors.text },
  sectionBody: { fontSize: 15, color: colors.muted, lineHeight: 23 },
  footer: { fontSize: 13, color: colors.muted, lineHeight: 21 },
});
