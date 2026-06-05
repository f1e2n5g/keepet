// 推播註冊：登入後呼叫，取得 Expo push token 並回報後端。
// Web 不支援，原生需要實機 + EAS projectId；全程 best-effort，失敗不影響使用。
import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { api } from "./api";

export async function registerPush(): Promise<void> {
  try {
    if (Platform.OS === "web" || !Device.isDevice) return;

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== "granted") {
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== "granted") return;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;
    const tokenResp = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    await api.registerPush({
      token: tokenResp.data,
      platform: Platform.OS === "ios" ? "ios" : "android",
    });
  } catch (err) {
    // 沒有實機 / 沒設定 EAS projectId 時會走到這裡，靜默略過
    console.log("push 註冊略過：", (err as Error)?.message);
  }
}
