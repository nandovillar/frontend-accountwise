import { supabase } from "@/src/lib/supabase";
import { Header } from "@react-navigation/elements";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function HomeScreen() {
  const [userName, setUserName] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7),
  );

  function diffInMonths(start: Date, end: Date) {
    let months =
      (end.getFullYear() - start.getFullYear()) * 12 +
      (end.getMonth() - start.getMonth());

    if (end.getDate() < start.getDate()) {
      months--;
    }

    return Math.max(0, months);
  }

  const [summary, setSummary] = useState({
    salary: 0,
    fixedPaid: 0,
    variables: 0,
    savings: 0,
  });

  // --------------------------
  // CARGAR PERFIL
  // --------------------------
  const loadProfile = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .single();

    setUserName(data?.username || "Usuario");
  };

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) router.replace("/login");
      loadProfile();
    };

    checkSession();
  }, []);

  // --------------------------
  // CAMBIAR MES (sin Date, sin bugs marzo/abril)
  // --------------------------
  const changeMonth = (offset: number) => {
    const [year, month] = selectedMonth.split("-").map(Number);

    let newYear = year;
    let newMonth = month + offset;

    if (newMonth < 1) {
      newMonth += 12;
      newYear -= 1;
    } else if (newMonth > 12) {
      newMonth -= 12;
      newYear += 1;
    }

    const monthStr = String(newMonth).padStart(2, "0");
    setSelectedMonth(`${newYear}-${monthStr}`);
  };

  // --------------------------
  // CARGAR RESUMEN MENSUAL
  // --------------------------
  const loadMonthlySummary = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    // 1. Sueldo
    const { data: profile } = await supabase
      .from("profiles")
      .select("salary")
      .eq("id", user.id)
      .single();

    const salary = profile?.salary || 0;

    // 2. Gastos fijos pagados
    const { data: fixed } = await supabase
      .from("fixed_expenses")
      .select("amount")
      .eq("month", selectedMonth)
      .eq("is_paid", true);

    const fixedPaid = fixed?.reduce((sum, f) => sum + f.amount, 0) || 0;

    // 3. Gastos variables
    const { data: vars } = await supabase
      .from("transactions")
      .select("amount")
      .eq("month", selectedMonth)
      .eq("type", "expense");

    const variables = vars?.reduce((sum, t) => sum + t.amount, 0) || 0;

    // 4. Ahorro total acumulado (RECALCULADO IGUAL QUE EN SAVINGSSCREEN)
    const { data: savingsList } = await supabase
      .from("savings")
      .select("monthly_amount, contributed, start_date, end_date");

    let totalSavings = 0;

    if (savingsList) {
      const now = new Date();

      savingsList.forEach((s) => {
        const start = new Date(s.start_date);
        const passedMonths = diffInMonths(start, now);

        const ahorradoActual =
          (s.contributed || 0) + passedMonths * (s.monthly_amount || 0);

        totalSavings += ahorradoActual;
      });
    }

    setSummary({
      salary,
      fixedPaid,
      variables,
      savings: totalSavings,
    });
  };

  useEffect(() => {
    loadMonthlySummary();
  }, [selectedMonth]);

  return (
    <View style={{ flex: 1 }}>
      <Header title="Inicio" />

      <Pressable
        style={styles.settingsButton}
        onPress={() => router.push("/settings")}
      >
        <Text style={styles.settingsButtonText}>☰</Text>
      </Pressable>

      <View style={styles.card}>
        <Text style={styles.logo}>AccountWise</Text>

        <Text style={styles.title}>Resumen mensual</Text>

        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text onPress={() => changeMonth(-1)}>◀️</Text>
          <Text>{selectedMonth}</Text>
          <Text onPress={() => changeMonth(1)}>▶️</Text>
        </View>

        <View style={styles.summaryBox}>
          <Text style={styles.summaryLabel}>Ingresos</Text>
          <Text style={styles.summaryAmount}>{summary.salary} €</Text>
        </View>

        <View style={styles.summaryBox}>
          <Text style={styles.summaryLabel}>Gastos</Text>
          <Text style={styles.summaryAmount}>
            {summary.fixedPaid + summary.variables} €
          </Text>
        </View>

        <View style={styles.summaryBox}>
          <Text style={styles.summaryLabel}>Ahorros</Text>
          <Text style={styles.summaryAmount}>{summary.savings} €</Text>
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
    flex: 1,
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    padding: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
    height: "100%",
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
    marginBottom: 25,
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
