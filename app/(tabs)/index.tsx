import { Ionicons } from "@expo/vector-icons";
import { Header } from "@react-navigation/elements";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";

import { supabase } from "@/src/lib/supabase";
import { colors } from "@/src/theme/colors";
import { createCommonStyles } from "@/src/theme/commonStyles";
import { getCurrentUser } from "@/src/utils/auth";
import { formatCompactMoney } from "@/src/utils/money";

import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

type Summary = {
  salary: number;
  fixedPaid: number;
  variables: number;
  savings: number;
};

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const commonStyles = useMemo(
    () => createCommonStyles(isDesktop),
    [isDesktop],
  );

  const styles = useMemo(() => createStyles(isDesktop), [isDesktop]);

  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7),
  );

  const [summary, setSummary] = useState<Summary>({
    salary: 0,
    fixedPaid: 0,
    variables: 0,
    savings: 0,
  });

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

        const totalMonths = Math.max(
          0,
          (end.getFullYear() - start.getFullYear()) * 12 +
            (end.getMonth() - start.getMonth()),
        );

        const rawPassed =
          (now.getFullYear() - start.getFullYear()) * 12 +
          (now.getMonth() - start.getMonth());

        const passedMonths =
          now < start ? 0 : Math.min(totalMonths, Math.max(0, rawPassed));

        const currentSaved =
          Number(saving.contributed || 0) +
          passedMonths * Number(saving.monthly_amount || 0);

        totalSavings += currentSaved;
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
    const init = async () => {
      const user = await getCurrentUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      await loadMonthlySummary();
    };

    init();

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

  const totalExpenses = summary.fixedPaid + summary.variables;
  const available = summary.salary - totalExpenses;

  return (
    <View style={commonStyles.screen}>
      <Header title="Inicio" />

      <Pressable
        style={commonStyles.settingsButton}
        onPress={() => router.push("/settings")}
      >
        <Text style={commonStyles.settingsButtonText}>☰</Text>
      </Pressable>

      <ScrollView contentContainerStyle={commonStyles.container}>
        <View style={commonStyles.content}>
          <View style={styles.heroCard}>
            <View style={styles.heroTextBlock}>
              <Text style={styles.heroLabel}>AccountWise</Text>

              <Text style={styles.heroTitle}>Resumen mensual</Text>

              <Text style={styles.heroSubtitle}>
                Vista rápida de ingresos, gastos y ahorro.
              </Text>
            </View>

            <View style={styles.heroIcon}>
              <Ionicons
                name="analytics-outline"
                size={28}
                color={colors.white}
              />
            </View>
          </View>

          <View style={styles.monthCard}>
            <Pressable
              style={styles.monthButton}
              onPress={() => changeMonth(-1)}
            >
              <Ionicons
                name="chevron-back"
                size={22}
                color={colors.primaryDark}
              />
            </Pressable>

            <Text style={styles.monthText}>{selectedMonth}</Text>

            <Pressable
              style={styles.monthButton}
              onPress={() => changeMonth(1)}
            >
              <Ionicons
                name="chevron-forward"
                size={22}
                color={colors.primaryDark}
              />
            </Pressable>
          </View>

          <View style={styles.balanceCard}>
            <View style={styles.balanceTextBlock}>
              <Text style={styles.balanceLabel}>Disponible</Text>

              <Text style={styles.balanceSubtitle}>
                Sueldo menos gastos del mes
              </Text>
            </View>

            <Text
              style={styles.balanceAmount}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
            >
              {formatCompactMoney(available)}
            </Text>
          </View>

          <View style={styles.kpiGrid}>
            <SummaryCard
              label="Ingresos"
              value={formatCompactMoney(summary.salary)}
              icon="trending-up-outline"
              styles={styles}
            />

            <SummaryCard
              label="Gastos"
              value={formatCompactMoney(totalExpenses)}
              icon="trending-down-outline"
              styles={styles}
            />

            <SummaryCard
              label="Ahorros"
              value={formatCompactMoney(summary.savings)}
              icon="cash-outline"
              styles={styles}
            />
          </View>

          <View style={commonStyles.card}>
            <Text style={commonStyles.cardTitle}>Detalle del mes</Text>

            <View style={styles.detailList}>
              <DetailRow
                label="Sueldo"
                value={formatCompactMoney(summary.salary)}
                styles={styles}
              />

              <DetailRow
                label="Gastos fijos pagados"
                value={formatCompactMoney(summary.fixedPaid)}
                styles={styles}
              />

              <DetailRow
                label="Otros gastos"
                value={formatCompactMoney(summary.variables)}
                styles={styles}
              />

              <DetailRow
                label="Disponible tras gastos"
                value={formatCompactMoney(available)}
                strong
                styles={styles}
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  styles,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryIcon}>
        <Ionicons name={icon} size={15} color={colors.primaryDark} />
      </View>

      <Text style={styles.summaryLabel}>{label}</Text>

      <Text
        style={styles.summaryAmount}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
      >
        {value}
      </Text>
    </View>
  );
}

function DetailRow({
  label,
  value,
  strong,
  styles,
}: {
  label: string;
  value: string;
  strong?: boolean;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel} numberOfLines={1}>
        {label}
      </Text>

      <Text
        style={[styles.detailValue, strong && styles.detailValueStrong]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {value}
      </Text>
    </View>
  );
}

const createStyles = (isDesktop: boolean) =>
  StyleSheet.create({
    heroCard: {
      backgroundColor: colors.primaryDark,
      borderRadius: isDesktop ? 20 : 18,
      padding: isDesktop ? 22 : 16,
      marginBottom: isDesktop ? 14 : 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 14,
      minHeight: isDesktop ? 128 : 108,
    },

    heroTextBlock: {
      flex: 1,
      minWidth: 0,
    },

    heroLabel: {
      fontSize: isDesktop ? 13 : 11,
      color: colors.white,
      opacity: 0.85,
      fontWeight: "800",
      marginBottom: 4,
    },

    heroTitle: {
      fontSize: isDesktop ? 28 : 23,
      color: colors.white,
      fontWeight: "900",
      marginBottom: 4,
    },

    heroSubtitle: {
      fontSize: isDesktop ? 13 : 11,
      color: colors.white,
      opacity: 0.85,
      fontWeight: "600",
    },

    heroIcon: {
      width: isDesktop ? 58 : 48,
      height: isDesktop ? 58 : 48,
      borderRadius: 999,
      backgroundColor: "rgba(255,255,255,0.16)",
      alignItems: "center",
      justifyContent: "center",
    },

    monthCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: isDesktop ? 10 : 8,
      marginBottom: isDesktop ? 14 : 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },

    monthButton: {
      width: isDesktop ? 40 : 36,
      height: isDesktop ? 40 : 36,
      borderRadius: 999,
      backgroundColor: colors.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },

    monthText: {
      fontSize: isDesktop ? 17 : 15,
      fontWeight: "900",
      color: colors.text,
    },

    balanceCard: {
      backgroundColor: colors.primaryDark,
      borderRadius: isDesktop ? 20 : 18,
      padding: isDesktop ? 22 : 16,
      marginBottom: isDesktop ? 14 : 12,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
    },

    balanceTextBlock: {
      flex: 1,
      minWidth: 0,
    },

    balanceLabel: {
      fontSize: isDesktop ? 13 : 11,
      color: colors.white,
      opacity: 0.85,
      fontWeight: "800",
      marginBottom: 4,
    },

    balanceSubtitle: {
      fontSize: isDesktop ? 12 : 10,
      color: colors.white,
      opacity: 0.8,
      fontWeight: "600",
    },

    balanceAmount: {
      maxWidth: isDesktop ? 260 : 150,
      fontSize: isDesktop ? 34 : 25,
      color: colors.white,
      fontWeight: "900",
      textAlign: "right",
    },

    kpiGrid: {
      flexDirection: "row",
      gap: isDesktop ? 10 : 8,
      marginBottom: isDesktop ? 14 : 12,
      justifyContent: "center",
      alignItems: "stretch",
    },

    summaryCard: {
      flex: 1,
      minWidth: 0,
      backgroundColor: colors.surface,
      borderRadius: isDesktop ? 16 : 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: isDesktop ? 15 : 12,
      paddingHorizontal: isDesktop ? 15 : 8,
      alignItems: "center",
      justifyContent: "center",
    },

    summaryIcon: {
      width: isDesktop ? 34 : 30,
      height: isDesktop ? 34 : 30,
      borderRadius: 10,
      backgroundColor: colors.primarySoft,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: isDesktop ? 10 : 7,
    },

    summaryLabel: {
      fontSize: isDesktop ? 12 : 9,
      color: colors.mutedText,
      fontWeight: "800",
      marginBottom: 4,
      textAlign: "center",
    },

    summaryAmount: {
      fontSize: isDesktop ? 19 : 14,
      color: colors.text,
      fontWeight: "900",
      textAlign: "center",
      width: "100%",
    },

    detailList: {
      marginTop: 10,
    },

    detailRow: {
      paddingVertical: isDesktop ? 11 : 9,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderSoft,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },

    detailLabel: {
      flex: 1,
      fontSize: isDesktop ? 13 : 11,
      color: colors.mutedText,
      fontWeight: "800",
    },

    detailValue: {
      maxWidth: "55%",
      fontSize: isDesktop ? 14 : 12,
      color: colors.text,
      fontWeight: "900",
      textAlign: "right",
    },

    detailValueStrong: {
      color: colors.primaryDark,
    },
  });
