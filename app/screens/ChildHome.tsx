import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Platform } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "../lib/api";
import { useSession } from "../lib/session";
import { Button, Card, H1, Muted, PointsBadge, StatBar } from "../components/ui";
import { PetView } from "../components/PetView";
import { EmptyState } from "./ParentHome";
import { colors, spacing, radius } from "../lib/theme";
import { xpForLevel, type ShopItem } from "@keepet/shared";

type Tab = "pet" | "tasks" | "shop";

function notify(msg: string) {
  if (Platform.OS === "web") {
    // RN Web 沒有原生 Alert UI；用 console + 簡單提示
    globalThis.alert?.(msg);
  } else {
    Alert.alert("KeePet", msg);
  }
}

export function ChildHome() {
  const { user, signOut } = useSession();
  const [tab, setTab] = useState<Tab>("pet");
  const balance = useQuery({
    queryKey: ["balance", user?.id],
    queryFn: () => api.balance(user!.id),
    enabled: !!user,
  });

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <View style={styles.spread}>
          <Text style={{ fontSize: 36 }}>{user?.avatar}</Text>
          <View style={{ marginLeft: spacing.sm }}>
            <Muted>嗨</Muted>
            <H1 style={{ marginBottom: 0 }}>{user?.name}</H1>
          </View>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <PointsBadge points={balance.data?.balance ?? 0} />
          <Button label="登出" variant="ghost" onPress={signOut} style={styles.logout} />
        </View>
      </View>

      <View style={styles.tabbar}>
        <TabBtn label="🐱 寵物" active={tab === "pet"} onPress={() => setTab("pet")} />
        <TabBtn label="📋 任務" active={tab === "tasks"} onPress={() => setTab("tasks")} />
        <TabBtn label="🛒 商店" active={tab === "shop"} onPress={() => setTab("shop")} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {tab === "pet" && <PetTab />}
        {tab === "tasks" && <TasksTab />}
        {tab === "shop" && <ShopTab balance={balance.data?.balance ?? 0} />}
      </ScrollView>
    </View>
  );
}

// ─── 寵物 ────────────────────────────────────────────────
function PetTab() {
  const pet = useQuery({ queryKey: ["pet"], queryFn: api.pet });
  if (pet.isLoading) return <Muted>載入中…</Muted>;
  if (!pet.data) return <EmptyState emoji="🥚" text="還沒有寵物" />;
  const p = pet.data;
  const need = xpForLevel(p.level);
  return (
    <View>
      <PetView pet={p} />
      <Card>
        <StatBar label="🍖 飽足" value={p.hunger} color={colors.hunger} />
        <StatBar label="😄 快樂" value={p.happiness} color={colors.happiness} />
        <StatBar label={`✨ 經驗 (Lv.${p.level})`} value={(p.xp / need) * 100} color={colors.blue} />
        <Muted>用積分去商店買食物，餵牠就會長大！</Muted>
      </Card>
    </View>
  );
}

// ─── 任務 ────────────────────────────────────────────────
function TasksTab() {
  const tasks = useQuery({ queryKey: ["childTasks"], queryFn: api.listTasks });
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});
  const complete = useMutation({
    mutationFn: (id: string) => api.completeTask(id),
    onSuccess: (_d, id) => {
      setSubmitted((s) => ({ ...s, [id]: true }));
      notify("已送出，等家長按核可就能拿到積分囉！⭐");
    },
    onError: (e, id) => {
      if (e instanceof ApiError && e.status === 409) {
        setSubmitted((s) => ({ ...s, [id]: true }));
        notify(e.message);
      } else {
        notify("送出失敗，請再試一次");
      }
    },
  });

  if (tasks.data?.length === 0) {
    return <EmptyState emoji="🎉" text="目前沒有任務，去陪寵物玩吧！" />;
  }
  return (
    <View>
      {(tasks.data ?? []).map((t) => {
        const done = submitted[t.id];
        return (
          <Card key={t.id}>
            <View style={styles.spread}>
              <View style={{ flex: 1 }}>
                <Text style={styles.taskTitle}>{t.title}</Text>
                {t.description ? <Muted>{t.description}</Muted> : null}
              </View>
              <PointsBadge points={t.points} />
            </View>
            <Button
              label={done ? "審核中…⏳" : "我完成了！"}
              variant={done ? "ghost" : "success"}
              disabled={done}
              onPress={() => complete.mutate(t.id)}
              style={{ marginTop: spacing.sm }}
            />
          </Card>
        );
      })}
    </View>
  );
}

// ─── 商店 ────────────────────────────────────────────────
const TYPE_LABEL: Record<ShopItem["type"], string> = {
  food: "🍎 食物",
  skin: "🎨 造型",
  accessory: "🎀 配件",
  real_reward: "🎁 現實獎勵",
};

function ShopTab({ balance }: { balance: number }) {
  const qc = useQueryClient();
  const shop = useQuery({ queryKey: ["shop"], queryFn: api.shop });
  const buy = useMutation({
    mutationFn: (item: ShopItem) => api.buy(item.id),
    onSuccess: (_d, item) => {
      qc.invalidateQueries({ queryKey: ["balance"] });
      qc.invalidateQueries({ queryKey: ["pet"] });
      notify(`買到「${item.name}」了！`);
    },
    onError: (e) =>
      notify(e instanceof ApiError && e.status === 402 ? "積分不夠，再去完成任務吧！" : "購買失敗"),
  });

  const items = shop.data ?? [];
  const groups = (Object.keys(TYPE_LABEL) as ShopItem["type"][])
    .map((type) => ({ type, list: items.filter((i) => i.type === type) }))
    .filter((g) => g.list.length > 0);

  return (
    <View>
      {groups.map((g) => (
        <View key={g.type}>
          <Text style={styles.groupTitle}>{TYPE_LABEL[g.type]}</Text>
          {g.list.map((item) => {
            const afford = balance >= item.cost;
            return (
              <Card key={item.id}>
                <View style={styles.spread}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.taskTitle}>{item.name}</Text>
                    <Muted>{describe(item)}</Muted>
                  </View>
                  <Button
                    label={`⭐ ${item.cost}`}
                    variant={afford ? "primary" : "ghost"}
                    disabled={!afford}
                    loading={buy.isPending && buy.variables?.id === item.id}
                    onPress={() => buy.mutate(item)}
                    style={{ paddingVertical: 10, paddingHorizontal: 18, minHeight: 0 }}
                  />
                </View>
              </Card>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function describe(item: ShopItem): string {
  const p = item.payload as Record<string, number>;
  if (item.type === "food") {
    const parts: string[] = [];
    if (p.hunger) parts.push(`飽足+${p.hunger}`);
    if (p.happiness) parts.push(`快樂+${p.happiness}`);
    if (p.xp) parts.push(`經驗+${p.xp}`);
    return parts.join("、");
  }
  if (item.type === "real_reward") return "兌換後請家長實現";
  return "幫寵物換上新造型";
}

// ─── 小元件 ──────────────────────────────────────────────
function TabBtn({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.tabBtn, active && styles.tabBtnActive]}>
      <Text style={[styles.tabBtnText, active && styles.tabBtnTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: spacing.lg,
    paddingTop: 56,
    paddingBottom: spacing.sm,
  },
  logout: { paddingVertical: 4, paddingHorizontal: 12, minHeight: 0, marginTop: 4 },
  tabbar: { flexDirection: "row", paddingHorizontal: spacing.lg, gap: spacing.sm },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: radius.pill, alignItems: "center" },
  tabBtnActive: { backgroundColor: colors.primary },
  tabBtnText: { fontWeight: "700", color: colors.muted },
  tabBtnTextActive: { color: "#fff" },
  body: { padding: spacing.lg, paddingBottom: 60 },
  taskTitle: { fontSize: 17, fontWeight: "700", color: colors.text },
  spread: { flexDirection: "row", alignItems: "center" },
  groupTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
});
