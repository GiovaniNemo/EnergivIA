import React from "react";
import { SafeAreaView, Text, useColorScheme } from "react-native";

export default function App() {
  const isDark = useColorScheme() === "dark";
  return (
    <SafeAreaView
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: isDark ? "#0f172a" : "#fff",
      }}
    >
      <Text style={{ fontSize: 18, color: isDark ? "#f8fafc" : "#0f172a" }}>Energivia</Text>
      <Text style={{ marginTop: 8, color: isDark ? "#94a3b8" : "#64748b" }}>
        API-first scaffold — ready for integration
      </Text>
    </SafeAreaView>
  );
}
