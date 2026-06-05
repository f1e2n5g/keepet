/**
 * KeePet 共用型別與常數 — 前端 (Expo) 與後端 (Cloudflare Worker) 共用。
 * 這是兩端的「契約」：改這裡，兩邊都會跟著對齊。
 */

// ─── 角色 ────────────────────────────────────────────────
export type Role = "parent" | "child";

// ─── 使用者 ──────────────────────────────────────────────
export interface User {
  id: string;
  family_id: string;
  role: Role;
  name: string;
  email: string | null; // 只有家長有
  avatar: string; // emoji 或頭像代號
  created_at: number;
}

// ─── 任務 ────────────────────────────────────────────────
export type Recurrence = "once" | "daily" | "weekly";

export interface Task {
  id: string;
  family_id: string;
  title: string;
  description: string;
  points: number;
  recurrence: Recurrence;
  assigned_child_id: string | null; // null = 全家小孩都可做
  created_by: string;
  active: boolean;
  created_at: number;
}

// ─── 任務完成（審核）─────────────────────────────────────
export type CompletionStatus = "pending" | "approved" | "rejected";

export interface TaskCompletion {
  id: string;
  task_id: string;
  child_id: string;
  status: CompletionStatus;
  submitted_at: number;
  reviewed_at: number | null;
  reviewed_by: string | null;
}

/** 待審核清單帶上任務資訊，方便家長端直接顯示 */
export interface PendingCompletion extends TaskCompletion {
  task_title: string;
  task_points: number;
  child_name: string;
}

// ─── 積分流水帳 ──────────────────────────────────────────
export interface LedgerEntry {
  id: string;
  child_id: string;
  delta: number; // 正=獲得, 負=花費
  reason: string;
  ref_type: string | null; // "task_completion" | "shop_purchase" | ...
  ref_id: string | null;
  created_at: number;
}

// ─── 寵物 ────────────────────────────────────────────────
export interface Pet {
  id: string;
  child_id: string;
  species: string;
  name: string;
  level: number;
  xp: number;
  hunger: number; // 0-100
  happiness: number; // 0-100
  current_skin: string;
  last_updated: number; // 衰減懶算基準
}

// ─── 商店 ────────────────────────────────────────────────
export type ShopItemType = "food" | "skin" | "accessory" | "real_reward";

export interface ShopItem {
  id: string;
  family_id: string | null; // null = 全域內建商品
  type: ShopItemType;
  name: string;
  cost: number;
  payload: Record<string, unknown>; // 例如 food: {hunger:+20, happiness:+5, xp:+10}
}

export interface InventoryItem {
  id: string;
  child_id: string;
  item_id: string;
  acquired_at: number;
  consumed: boolean;
}

// ─── 衰減設定（前後端共用同一份規則）────────────────────
// 每「小時」衰減量；伺服器讀取寵物時依 last_updated 懶算。
export const DECAY_PER_HOUR = {
  hunger: 8,
  happiness: 6,
} as const;

/** 餵食/互動可加的上限值，避免超過 100 */
export function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

/** 升級曲線：第 n 級所需累計 xp。簡單線性 + 漸增。 */
export function xpForLevel(level: number): number {
  return level * 100;
}

// ─── API 請求/回應形狀 ───────────────────────────────────
export interface AuthResponse {
  token: string;
  user: User;
}

export interface RegisterBody {
  family_name: string;
  parent_name: string;
  email: string;
  password: string;
}

export interface LoginBody {
  email: string;
  password: string;
}

export interface CreateChildBody {
  name: string;
  avatar: string;
  pin: string; // 4 碼
}

export interface ChildLoginBody {
  child_id: string;
  pin: string;
}

export interface CreateTaskBody {
  title: string;
  description?: string;
  points: number;
  recurrence?: Recurrence;
  assigned_child_id?: string | null;
}

export interface ReviewBody {
  approve: boolean;
}

export interface BalanceResponse {
  child_id: string;
  balance: number;
}

export interface BuyResponse {
  balance: number;
  pet?: Pet;
  inventory_item?: InventoryItem;
}

export interface ApiError {
  error: string;
}
