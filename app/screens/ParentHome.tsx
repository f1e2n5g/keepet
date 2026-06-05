import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, ScrollView, Pressable } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError, type ChildWithBalance } from "../lib/api";
import { useSession } from "../lib/session";
import { Button, Card, H1, Muted, PointsBadge } from "../components/ui";
import { colors, spacing, radius } from "../lib/theme";
import type { Task, PendingCompletion, Recurrence } from "@keepet/shared";

type Tab = "tasks" | "approvals" | "children";
const AVATARS = ["🐣", "🦊", "🐶", "🐱", "🐼", "🦁", "🐸", "🦄"];

export function ParentHome() {
  const { user, signOut, signIn } = useSession();
  const [tab, setTab] = useState<Tab>("tasks");
  const pending = useQuery({ queryKey: ["pending"], queryFn: api.pendingCompletions });

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <View>
          <Muted>家長模式</Muted>
          <H1 style={{ marginBottom: 0 }}>嗨，{user?.name} 👋</H1>
        </View>
        <Button label="登出" variant="ghost" onPress={signOut} style={styles.logout} />
      </View>

      <View style={styles.tabbar}>
        <TabBtn label="任務" active={tab === "tasks"} onPress={() => setTab("tasks")} />
        <TabBtn
          label={`待審核${pending.data?.length ? ` (${pending.data.length})` : ""}`}
          active={tab === "approvals"}
          onPress={() => setTab("approvals")}
        />
        <TabBtn label="孩子" active={tab === "children"} onPress={() => setTab("children")} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {tab === "tasks" && <TasksTab />}
        {tab === "approvals" && <ApprovalsTab />}
        {tab === "children" && <ChildrenTab onChildLogin={signIn} />}
      </ScrollView>
    </View>
  );
}

// ─── 任務 ────────────────────────────────────────────────
function TasksTab() {
  const qc = useQueryClient();
  const tasks = useQuery({ queryKey: ["tasks"], queryFn: api.listTasks });
  const children = useQuery({ queryKey: ["children"], queryFn: api.listChildren });
  const [title, setTitle] = useState("");
  const [points, setPoints] = useState("10");
  const [recurrence, setRecurrence] = useState<Recurrence>("once");
  const [assignee, setAssignee] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () =>
      api.createTask({
        title: title.trim(),
        points: Number(points) || 0,
        recurrence,
        assigned_child_id: assignee,
      }),
    onSuccess: () => {
      setTitle("");
      setPoints("10");
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "建立失敗"),
  });

  const toggle = useMutation({
    mutationFn: (t: Task) => api.updateTask(t.id, { active: !t.active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  return (
    <View>
      <Card>
        <Text style={styles.cardTitle}>新增任務</Text>
        <TextInput
          style={styles.input}
          placeholder="任務名稱（例如：刷牙、收玩具）"
          placeholderTextColor={colors.muted}
          value={title}
          onChangeText={setTitle}
        />
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>積分</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={points}
              onChangeText={setPoints}
            />
          </View>
          <View style={{ flex: 2, marginLeft: spacing.sm }}>
            <Text style={styles.fieldLabel}>重複</Text>
            <View style={styles.chips}>
              {(["once", "daily", "weekly"] as Recurrence[]).map((r) => (
                <Chip
                  key={r}
                  label={r === "once" ? "一次" : r === "daily" ? "每天" : "每週"}
                  active={recurrence === r}
                  onPress={() => setRecurrence(r)}
                />
              ))}
            </View>
          </View>
        </View>
        <Text style={styles.fieldLabel}>指派給</Text>
        <View style={styles.chips}>
          <Chip label="全部小孩" active={assignee === null} onPress={() => setAssignee(null)} />
          {(children.data ?? []).map((c) => (
            <Chip
              key={c.id}
              label={`${c.avatar} ${c.name}`}
              active={assignee === c.id}
              onPress={() => setAssignee(c.id)}
            />
          ))}
        </View>
        {error && <Text style={styles.error}>{error}</Text>}
        <Button
          label="建立任務"
          onPress={() => {
            setError(null);
            if (!title.trim()) return setError("請輸入任務名稱");
            create.mutate();
          }}
          loading={create.isPending}
          style={{ marginTop: spacing.sm }}
        />
      </Card>

      {(tasks.data ?? []).map((t) => (
        <Card key={t.id} style={{ opacity: t.active ? 1 : 0.5 }}>
          <View style={styles.spread}>
            <View style={{ flex: 1 }}>
              <Text style={styles.taskTitle}>{t.title}</Text>
              <Muted>
                {t.recurrence === "once" ? "一次性" : t.recurrence === "daily" ? "每天" : "每週"}
                {t.assigned_child_id ? " · 指定" : " · 全部小孩"}
              </Muted>
            </View>
            <PointsBadge points={t.points} />
            <Button
              label={t.active ? "停用" : "啟用"}
              variant="ghost"
              onPress={() => toggle.mutate(t)}
              style={{ marginLeft: spacing.sm, paddingVertical: 8, paddingHorizontal: 14, minHeight: 0 }}
            />
          </View>
        </Card>
      ))}
      {tasks.data?.length === 0 && <Muted>還沒有任務，先新增一個吧！</Muted>}
    </View>
  );
}

// ─── 待審核 ──────────────────────────────────────────────
function ApprovalsTab() {
  const qc = useQueryClient();
  const pending = useQuery({ queryKey: ["pending"], queryFn: api.pendingCompletions });
  const review = useMutation({
    mutationFn: ({ id, approve }: { id: string; approve: boolean }) => api.review(id, approve),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pending"] });
      qc.invalidateQueries({ queryKey: ["children"] });
    },
  });

  if (pending.data?.length === 0) {
    return <EmptyState emoji="✅" text="目前沒有待審核的任務" />;
  }
  return (
    <View>
      {(pending.data ?? []).map((c: PendingCompletion) => (
        <Card key={c.id}>
          <View style={styles.spread}>
            <View style={{ flex: 1 }}>
              <Text style={styles.taskTitle}>{c.task_title}</Text>
              <Muted>{c.child_name} 說完成了</Muted>
            </View>
            <PointsBadge points={c.task_points} />
          </View>
          <View style={[styles.row, { marginTop: spacing.sm }]}>
            <Button
              label="退回"
              variant="danger"
              onPress={() => review.mutate({ id: c.id, approve: false })}
              style={{ flex: 1, marginRight: spacing.sm }}
            />
            <Button
              label="核可給分"
              variant="success"
              onPress={() => review.mutate({ id: c.id, approve: true })}
              style={{ flex: 2 }}
            />
          </View>
        </Card>
      ))}
    </View>
  );
}

// ─── 孩子 ────────────────────────────────────────────────
function ChildrenTab({
  onChildLogin,
}: {
  onChildLogin: (token: string, user: ChildWithBalance) => Promise<void>;
}) {
  const qc = useQueryClient();
  const children = useQuery({ queryKey: ["children"], queryFn: api.listChildren });
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  const add = useMutation({
    mutationFn: () => api.createChild({ name: name.trim(), avatar, pin }),
    onSuccess: () => {
      setName("");
      setPin("");
      qc.invalidateQueries({ queryKey: ["children"] });
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "新增失敗"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.deleteChild(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["children"] }),
  });

  const [loginFor, setLoginFor] = useState<ChildWithBalance | null>(null);
  const [loginPin, setLoginPin] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const doLogin = useMutation({
    mutationFn: async (child: ChildWithBalance) => {
      const res = await api.childLogin({ child_id: child.id, pin: loginPin });
      return res;
    },
    onSuccess: (res) => onChildLogin(res.token, res.user as ChildWithBalance),
    onError: () => setLoginError("PIN 不對喔"),
  });

  return (
    <View>
      <Card>
        <Text style={styles.cardTitle}>新增小朋友</Text>
        <TextInput
          style={styles.input}
          placeholder="小朋友名字"
          placeholderTextColor={colors.muted}
          value={name}
          onChangeText={setName}
        />
        <Text style={styles.fieldLabel}>選頭像</Text>
        <View style={styles.chips}>
          {AVATARS.map((a) => (
            <Pressable
              key={a}
              onPress={() => setAvatar(a)}
              style={[styles.avatar, avatar === a && styles.avatarActive]}
            >
              <Text style={{ fontSize: 24 }}>{a}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.fieldLabel}>4 碼 PIN（登入用）</Text>
        <TextInput
          style={styles.input}
          placeholder="1234"
          placeholderTextColor={colors.muted}
          keyboardType="number-pad"
          maxLength={4}
          value={pin}
          onChangeText={setPin}
        />
        {error && <Text style={styles.error}>{error}</Text>}
        <Button
          label="新增小朋友"
          onPress={() => {
            setError(null);
            if (!name.trim()) return setError("請輸入名字");
            if (!/^\d{4}$/.test(pin)) return setError("PIN 需要 4 碼數字");
            add.mutate();
          }}
          loading={add.isPending}
          style={{ marginTop: spacing.sm }}
        />
      </Card>

      {(children.data ?? []).map((c) => (
        <Card key={c.id}>
          <View style={styles.spread}>
            <Text style={{ fontSize: 32 }}>{c.avatar}</Text>
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Text style={styles.taskTitle}>{c.name}</Text>
              <PointsBadge points={c.balance} />
            </View>
            <Button
              label="登入"
              onPress={() => {
                setLoginFor(c);
                setLoginPin("");
                setLoginError(null);
              }}
              style={{ paddingVertical: 8, paddingHorizontal: 16, minHeight: 0 }}
            />
          </View>

          {loginFor?.id === c.id && (
            <View style={{ marginTop: spacing.sm }}>
              <TextInput
                style={styles.input}
                placeholder="輸入 PIN"
                placeholderTextColor={colors.muted}
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry
                value={loginPin}
                onChangeText={setLoginPin}
              />
              {loginError && <Text style={styles.error}>{loginError}</Text>}
              <Button
                label={`以 ${c.name} 身分進入`}
                variant="success"
                onPress={() => doLogin.mutate(c)}
                loading={doLogin.isPending}
                style={{ marginTop: spacing.xs }}
              />
              <Button
                label="刪除這個小孩"
                variant="ghost"
                onPress={() => remove.mutate(c.id)}
                style={{ marginTop: spacing.xs }}
              />
            </View>
          )}
        </Card>
      ))}
      {children.data?.length === 0 && <Muted>還沒有小朋友，先新增一位吧！</Muted>}
    </View>
  );
}

// ─── 小元件 ──────────────────────────────────────────────
function TabBtn({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.tabBtn, active && styles.tabBtnActive]}>
      <Text style={[styles.tabBtnText, active && styles.tabBtnTextActive]}>{label}</Text>
    </Pressable>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export function EmptyState({ emoji, text }: { emoji: string; text: string }) {
  return (
    <View style={styles.empty}>
      <Text style={{ fontSize: 56 }}>{emoji}</Text>
      <Muted>{text}</Muted>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: 56,
    paddingBottom: spacing.sm,
  },
  logout: { paddingVertical: 8, paddingHorizontal: 16, minHeight: 0 },
  tabbar: { flexDirection: "row", paddingHorizontal: spacing.lg, gap: spacing.sm },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: radius.pill, alignItems: "center" },
  tabBtnActive: { backgroundColor: colors.primary },
  tabBtnText: { fontWeight: "700", color: colors.muted },
  tabBtnTextActive: { color: "#fff" },
  body: { padding: spacing.lg, paddingBottom: 60 },
  cardTitle: { fontSize: 18, fontWeight: "800", color: colors.text, marginBottom: spacing.sm },
  taskTitle: { fontSize: 17, fontWeight: "700", color: colors.text },
  row: { flexDirection: "row", alignItems: "flex-end" },
  spread: { flexDirection: "row", alignItems: "center" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginBottom: spacing.sm },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: "#fff",
  },
  avatarActive: { borderColor: colors.primary, backgroundColor: "#FEF3C7" },
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
    marginBottom: spacing.sm,
  },
  error: { color: colors.danger, marginBottom: spacing.sm, fontWeight: "600" },
  empty: { alignItems: "center", paddingVertical: 60, gap: spacing.sm },
});
