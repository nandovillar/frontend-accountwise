import { supabase } from "@/src/lib/supabase";
import { colors } from "@/src/theme/colors";
import { Header } from "@react-navigation/elements";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function HomeScreen() {
  const [userName, setUserName] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7),
  );

  const [summary, setSummary] = useState({
    salary: 0,
    fixedPaid: 0,
    variables: 0,
    savings: 0,
  });

  const totalExpenses = summary.fixedPaid + summary.variables;
  const available = summary.salary - totalExpenses;

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

  const loadMonthlySummary = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("salary")
      .eq("id", user.id)
      .single();

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

      savingsList.forEach((item) => {
        const start = new Date(item.start_date);
        const end = new Date(item.end_date);

        const totalMonths =
          (end.getFullYear() - start.getFullYear()) * 12 +
          (end.getMonth() - start.getMonth());

        const rawPassed =
          (now.getFullYear() - start.getFullYear()) * 12 +
          (now.getMonth() - start.getMonth());

        const passedMonths = Math.min(totalMonths, Math.max(0, rawPassed));

        const currentSaving =
          Number(item.contributed || 0) +
          passedMonths * Number(item.monthly_amount || 0);

        totalSavings += currentSaving;
      });
    }

    setSummary({
      salary,
      fixedPaid,
      variables,
      savings: totalSavings,
    });
  };

  const loadAll = async () => {
    await loadProfile();
    await loadMonthlySummary();
  };

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        setTimeout(checkSession, 200);
        return;
      }

      await loadAll();
    };

    checkSession();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (_, session) => {
        if (session?.user) {
          await loadAll();
        }
      },
    );

    return () => subscription.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    loadMonthlySummary();
  }, [selectedMonth]);

  const changeMonth = (offset: number) => {
    const [year, month] = selectedMonth.split("-").map(Number);

    let newYear = year;
    let newMonth = month + offset;

    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }

    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }

    setSelectedMonth(`${newYear}-${String(newMonth).padStart(2, "0")}`);
  };

  return (
    <View style={styles.screen}>
      <Header title="Inicio" />

      <Pressable
        style={styles.settingsButton}
        onPress={() => router.push("/settings")}
      >
        <Text style={styles.settingsButtonText}>☰</Text>
      </Pressable>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.content}>
          <View style={styles.headerBlock}>
            <Text style={styles.logo}>AccountWise</Text>
            <Text style={styles.subtitle}>Resumen mensual</Text>
            <Text style={styles.helloText}>Hola, {userName}</Text>
          </View>

          <View style={styles.monthCard}>
            <Pressable
              style={styles.monthButton}
              onPress={() => changeMonth(-1)}
            >
              <Text style={styles.monthButtonText}>‹</Text>
            </Pressable>

            <Text style={styles.monthText}>{selectedMonth}</Text>

            <Pressable
              style={styles.monthButton}
              onPress={() => changeMonth(1)}
            >
              <Text style={styles.monthButtonText}>›</Text>
            </Pressable>
          </View>

          <View style={styles.balanceCard}>
            <View>
              <Text style={styles.balanceLabel}>Balance mensual</Text>
              <Text style={styles.balanceSubText}>Disponible este mes</Text>
            </View>

            <Text style={styles.balanceAmount}>{available} €</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Ingresos</Text>
              <Text style={styles.summaryAmount}>{summary.salary} €</Text>
            </View>

            <View style={styles.separator} />

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Gastos</Text>
              <Text style={styles.summaryAmount}>{totalExpenses} €</Text>
            </View>

            <View style={styles.separator} />

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Ahorros</Text>
              <Text style={styles.summaryAmount}>{summary.savings} €</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const isWeb = Platform.OS === "web";

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  container: {
    flexGrow: 1,
    padding: isWeb ? 28 : 16,
    paddingBottom: 36,
    alignItems: "center",
  },

  content: {
    width: "100%",
    maxWidth: 760,
  },

  headerBlock: {
    marginTop: isWeb ? 20 : 10,
    marginBottom: 16,
  },

  logo: {
    fontSize: isWeb ? 32 : 26,
    fontWeight: "900",
    color: colors.text,
    textAlign: "center",
  },

  subtitle: {
    fontSize: isWeb ? 18 : 15,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
    marginTop: 8,
  },

  helloText: {
    fontSize: isWeb ? 14 : 12,
    color: colors.mutedText,
    textAlign: "center",
    marginTop: 4,
  },

  monthCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  monthButton: {
    width: isWeb ? 34 : 30,
    height: isWeb ? 34 : 30,
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },

  monthButtonText: {
    fontSize: isWeb ? 24 : 22,
    lineHeight: isWeb ? 26 : 24,
    color: colors.primaryDark,
    fontWeight: "900",
  },

  monthText: {
    fontSize: isWeb ? 16 : 14,
    fontWeight: "900",
    color: colors.text,
  },

  balanceCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: isWeb ? 18 : 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  balanceLabel: {
    fontSize: isWeb ? 15 : 13,
    fontWeight: "800",
    color: colors.text,
  },

  balanceSubText: {
    fontSize: isWeb ? 13 : 11,
    color: colors.mutedText,
    marginTop: 3,
  },

  balanceAmount: {
    fontSize: isWeb ? 28 : 24,
    fontWeight: "900",
    color: colors.primaryDark,
  },

  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },

  summaryRow: {
    paddingVertical: isWeb ? 14 : 12,
    paddingHorizontal: isWeb ? 16 : 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  summaryLabel: {
    fontSize: isWeb ? 14 : 12,
    color: colors.mutedText,
    fontWeight: "700",
  },

  summaryAmount: {
    fontSize: isWeb ? 17 : 15,
    fontWeight: "900",
    color: colors.text,
  },

  separator: {
    height: 1,
    backgroundColor: colors.borderSoft,
  },

  settingsButton: {
    position: "absolute",
    top: 24,
    right: 24,
    width: isWeb ? 42 : 38,
    height: isWeb ? 42 : 38,
    borderRadius: 999,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    zIndex: 10,
  },

  settingsButtonText: {
    fontSize: isWeb ? 22 : 20,
    color: colors.text,
    fontWeight: "900",
  },
});
