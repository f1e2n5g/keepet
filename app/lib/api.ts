// KeePet API client — 薄包裝 fetch，自動帶 JWT、統一錯誤處理。
import Constants from "expo-constants";
import type {
  AuthResponse,
  RegisterBody,
  LoginBody,
  ChildLoginBody,
  CreateChildBody,
  CreateTaskBody,
  Task,
  PendingCompletion,
  ShopItem,
  Pet,
  User,
} from "@keepet/shared";

const API_URL: string =
  (process.env.EXPO_PUBLIC_API_URL as string | undefined) ??
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  "http://localhost:8787";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

let authToken: string | null = null;
export function setAuthToken(token: string | null) {
  authToken = token;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new ApiError(data?.error ?? `請求失敗 (${res.status})`, res.status);
  }
  return data as T;
}

export interface ChildWithBalance extends User {
  balance: number;
}

export const api = {
  // ── 認證 ──
  register: (body: RegisterBody) =>
    request<AuthResponse>("/auth/register", { method: "POST", body: JSON.stringify(body) }),
  login: (body: LoginBody) =>
    request<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify(body) }),
  childLogin: (body: ChildLoginBody) =>
    request<AuthResponse>("/auth/child-login", { method: "POST", body: JSON.stringify(body) }),
  me: () => request<User>("/me"),

  // ── 小孩管理 ──
  listChildren: () => request<ChildWithBalance[]>("/children"),
  createChild: (body: CreateChildBody) =>
    request<User>("/children", { method: "POST", body: JSON.stringify(body) }),
  deleteChild: (id: string) => request<{ ok: boolean }>(`/children/${id}`, { method: "DELETE" }),
  balance: (childId: string) =>
    request<{ child_id: string; balance: number }>(`/children/${childId}/balance`),

  // ── 任務 ──
  listTasks: () => request<Task[]>("/tasks"),
  createTask: (body: CreateTaskBody) =>
    request<Task>("/tasks", { method: "POST", body: JSON.stringify(body) }),
  updateTask: (id: string, body: Partial<CreateTaskBody> & { active?: boolean }) =>
    request<Task>(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  completeTask: (id: string) =>
    request<{ id: string; status: string }>(`/tasks/${id}/complete`, { method: "POST" }),

  // ── 審核 ──
  pendingCompletions: () =>
    request<PendingCompletion[]>("/completions?status=pending"),
  review: (id: string, approve: boolean) =>
    request<{ ok: boolean; approved: boolean; child_id: string; balance: number }>(
      `/completions/${id}/review`,
      { method: "POST", body: JSON.stringify({ approve }) },
    ),

  // ── 商店 / 寵物 ──
  shop: () => request<ShopItem[]>("/shop"),
  buy: (itemId: string) =>
    request<{ balance: number; pet?: Pet }>(`/shop/${itemId}/buy`, { method: "POST" }),
  pet: () => request<Pet>("/pet"),
  petForChild: (childId: string) => request<Pet>(`/pet?child_id=${childId}`),
  setSkin: (skin: string) =>
    request<Pet>("/pet/skin", { method: "POST", body: JSON.stringify({ skin }) }),
};

export { API_URL };
