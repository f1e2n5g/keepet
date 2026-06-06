import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSession } from "./lib/session";
import { colors } from "./lib/theme";
import { LoginScreen } from "./screens/LoginScreen";
import { ParentHome } from "./screens/ParentHome";
import { ChildHome } from "./screens/ChildHome";
import { OnboardingScreen } from "./screens/OnboardingScreen";
import { storageGet, storageSet } from "./lib/storage";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

SplashScreen.preventAutoHideAsync().catch(() => {});

function Root() {
  const { loading, user, hydrate } = useSession();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    hydrate();
    storageGet("keepet_onboarded").then((v) => {
      setOnboarded(v === "1");
      SplashScreen.hideAsync().catch(() => {});
    });
  }, [hydrate]);

  const finishOnboarding = async () => {
    await storageSet("keepet_onboarded", "1");
    setOnboarded(true);
  };

  if (loading || onboarded === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!onboarded) return <OnboardingScreen onDone={finishOnboarding} />;
  if (!user) return <LoginScreen />;
  return user.role === "parent" ? <ParentHome /> : <ChildHome />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      <Root />
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
});
