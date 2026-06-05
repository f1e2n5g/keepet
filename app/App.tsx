import React, { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSession } from "./lib/session";
import { colors } from "./lib/theme";
import { LoginScreen } from "./screens/LoginScreen";
import { ParentHome } from "./screens/ParentHome";
import { ChildHome } from "./screens/ChildHome";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

function Root() {
  const { loading, user, hydrate } = useSession();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
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
