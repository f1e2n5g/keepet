import { create } from "zustand";
import type { User } from "@keepet/shared";
import { storageGet, storageSet, storageDelete } from "./storage";
import { setAuthToken } from "./api";

const TOKEN_KEY = "keepet.token";
const USER_KEY = "keepet.user";

interface SessionState {
  token: string | null;
  user: User | null;
  loading: boolean; // 啟動時還在讀儲存
  hydrate: () => Promise<void>;
  signIn: (token: string, user: User) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useSession = create<SessionState>((set) => ({
  token: null,
  user: null,
  loading: true,

  hydrate: async () => {
    const [token, userStr] = await Promise.all([
      storageGet(TOKEN_KEY),
      storageGet(USER_KEY),
    ]);
    if (token && userStr) {
      setAuthToken(token);
      set({ token, user: JSON.parse(userStr) as User, loading: false });
    } else {
      set({ loading: false });
    }
  },

  signIn: async (token, user) => {
    setAuthToken(token);
    await Promise.all([
      storageSet(TOKEN_KEY, token),
      storageSet(USER_KEY, JSON.stringify(user)),
    ]);
    set({ token, user });
  },

  signOut: async () => {
    setAuthToken(null);
    await Promise.all([storageDelete(TOKEN_KEY), storageDelete(USER_KEY)]);
    set({ token: null, user: null });
  },
}));
