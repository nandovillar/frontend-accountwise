import { supabase } from "@/src/lib/supabase";
import { router } from "expo-router";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
export default function HomeScreen() {
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        router.replace("/login");
      }
    };

    checkSession();
  }, []);
  return (
    <View style={styles.container}>
      <Pressable
        style={styles.settingsButton}
        onPress={() => router.push("/settings")}
      >
        <Text style={styles.settingsButtonText}>⚙️</Text>
      </Pressable>

      <View style={styles.card}>
        <Text style={styles.logo}>AccountWise</Text>

        <Text style={styles.title}>Resumen mensual</Text>

        <View style={styles.summaryBox}>
          <Text style={styles.summaryLabel}>Ingresos</Text>
          <Text style={styles.summaryAmount}>0 €</Text>
        </View>

        <View style={styles.summaryBox}>
          <Text style={styles.summaryLabel}>Gastos</Text>
          <Text style={styles.summaryAmount}>0 €</Text>
        </View>

        <View style={styles.summaryBox}>
          <Text style={styles.summaryLabel}>Ahorros</Text>
          <Text style={styles.summaryAmount}>0 €</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: "100%",
    backgroundColor: "#F4F7FA",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  input: {
    width: "100%",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 14,
    padding: 14,
    fontSize: 16,
    marginBottom: 14,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  logo: {
    fontSize: 34,
    fontWeight: "800",
    color: "#1F2937",
    marginBottom: 18,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 28,
  },
  primaryButton: {
    width: "100%",
    backgroundColor: "#2563EB",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    width: "100%",
    backgroundColor: "#E5E7EB",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "700",
  },
  settingsButton: {
    position: "absolute",
    top: 24,
    right: 24,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  settingsButtonText: {
    fontSize: 22,
  },
  summaryBox: {
    width: "100%",
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
  },
});
