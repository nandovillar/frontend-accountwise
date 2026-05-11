import { supabase } from "@/src/lib/supabase";
import { Header } from "@react-navigation/elements";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function HomeScreen() {
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7),
  );

  const [summary, setSummary] = useState({
    salary: 0,
    fixedPaid: 0,
    variables: 0,
    savings: 0,
  });

  const getCurrentUser = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.user ?? null;
  };

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

  const loadMonthlySummary = async () => {
    const user = await getCurrentUser();

    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("salary")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile) {
      await supabase.from("profiles").insert({
        id: user.id,
        salary: 0,
      });
    }

    const salary = Number(profile?.salary || 0);

    const { data: fixed } = await supabase
      .from("fixed_expenses")
      .select("amount")
      .eq("user_id", user.id)
      .eq("month", selectedMonth)
      .eq("is_paid", true);

    const fixedPaid =
      fixed?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;

    const { data: vars } = await supabase
      .from("transactions")
      .select("amount")
      .eq("user_id", user.id)
      .eq("month", selectedMonth)
      .eq("type", "expense");

    const variables =
      vars?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;

    const { data: savingsList } = await supabase
      .from("savings")
      .select("monthly_amount, contributed, start_date, end_date")
      .eq("user_id", user.id);

    let totalSavings = 0;

    if (savingsList) {
      const now = new Date();

      savingsList.forEach((saving) => {
        const start = new Date(saving.start_date);
        const end = new Date(saving.end_date);

        const totalMonths =
          (end.getFullYear() - start.getFullYear()) * 12 +
          (end.getMonth() - start.getMonth());

        const rawPassed =
          (now.getFullYear() - start.getFullYear()) * 12 +
          (now.getMonth() - start.getMonth());

        const passedMonths = Math.max(0, Math.min(totalMonths, rawPassed));

        const ahorradoActual =
          Number(saving.contributed || 0) +
          passedMonths * Number(saving.monthly_amount || 0);

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
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setTimeout(checkSession, 200);
        return;
      }

      await loadMonthlySummary();
    };

    checkSession();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (_, session) => {
        if (session?.user) {
          await loadMonthlySummary();
        }
      },
    );

    return () => subscription.subscription.unsubscribe();
  }, []);

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

        <View style={styles.monthRow}>
          <Text style={styles.monthArrow} onPress={() => changeMonth(-1)}>
            ◀
          </Text>

          <Text style={styles.monthText}>{selectedMonth}</Text>

          <Text style={styles.monthArrow} onPress={() => changeMonth(1)}>
            ▶
          </Text>
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
          <Text style={styles.summaryAmount}>
            {summary.savings.toFixed(0)} €
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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

  monthRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    alignItems: "center",
    marginBottom: 8,
  },

  monthArrow: {
    fontSize: 16,
  },

  monthText: {
    fontSize: 15,
    color: "#111827",
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
    zIndex: 10,
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
