import { Ionicons } from "@expo/vector-icons";
import { Header } from "@react-navigation/elements";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { DataState } from "@/src/components/DataState";
import { SpaceSwitcher } from "@/src/components/SpaceSwitcher";
import { useSpaces } from "@/src/context/SpaceContext";
import { useAppTheme } from "@/src/context/ThemeContext";
import { supabase } from "@/src/lib/supabase";
import { colors } from "@/src/theme/colors";
import { createCommonStyles } from "@/src/theme/commonStyles";
import { getCurrentUser } from "@/src/utils/auth";
import { formatCompactMoney } from "@/src/utils/money";
import { applySpaceFilter } from "@/src/utils/spaceQueries";

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
  categoryTotals: {
    category: string;
    amount: number;
  }[];
};

export default function HomeScreen() {
  const { activeSpaceId } = useSpaces();
  const { themeId } = useAppTheme();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const commonStyles = useMemo(() => {
    void themeId;
    return createCommonStyles(isDesktop);
  }, [isDesktop, themeId]);

  const styles = useMemo(() => {
    void themeId;
    return createStyles(isDesktop);
  }, [isDesktop, themeId]);

  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7),
  );
  const [dataError, setDataError] = useState("");
  const [hasLoadedData, setHasLoadedData] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const loadInProgressRef = useRef(false);

  const [summary, setSummary] = useState<Summary>({
    salary: 0,
    fixedPaid: 0,
    variables: 0,
    savings: 0,
    categoryTotals: [],
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

  const loadMonthlySummary = useCallback(async () => {
    if (loadInProgressRef.current) return;

    loadInProgressRef.current = true;
    setIsLoadingData(true);
    setDataError("");

    const user = await getCurrentUser();

    if (!user) {
      setHasLoadedData(true);
      setIsLoadingData(false);
      loadInProgressRef.current = false;
      return;
    }

    let salary = 0;

    if (activeSpaceId) {
      const { data: spaceSettings } = await supabase
        .from("space_settings")
        .select("monthly_income")
        .eq("space_id", activeSpaceId)
        .maybeSingle();

      salary = Number(spaceSettings?.monthly_income || 0);

      const { data: incomeRows } = await supabase
        .from("space_contributions")
        .select("amount")
        .eq("space_id", activeSpaceId)
        .eq("month", selectedMonth);

      salary +=
        incomeRows?.reduce(
          (sum: number, item: { amount: number }) =>
            sum + Number(item.amount || 0),
          0,
        ) || 0;
    } else {
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

      salary = Number(profile?.salary || 0);
    }

    const fixedQuery = supabase
      .from("fixed_expenses")
      .select("amount, category")
      .eq("month", selectedMonth)
      .eq("is_paid", true);
    const { data: fixed } = await applySpaceFilter(
      fixedQuery,
      user.id,
      activeSpaceId,
    );

    const fixedPaid =
      fixed?.reduce(
        (sum: number, item: { amount: number }) => sum + Number(item.amount),
        0,
      ) || 0;

    const varsQuery = supabase
      .from("transactions")
      .select("amount, category")
      .eq("month", selectedMonth)
      .eq("type", "expense");
    const { data: vars } = await applySpaceFilter(
      varsQuery,
      user.id,
      activeSpaceId,
    );

    const variables =
      vars?.reduce(
        (sum: number, item: { amount: number }) => sum + Number(item.amount),
        0,
      ) || 0;

    const categoryMap = new Map<string, number>();
    [...(fixed || []), ...(vars || [])].forEach((item: any) => {
      const category = item.category || "Otros";
      categoryMap.set(
        category,
        (categoryMap.get(category) || 0) + Number(item.amount || 0),
      );
    });

    const categoryTotals = Array.from(categoryMap.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);

    const savingsQuery = supabase
      .from("savings")
      .select(
        "monthly_amount, contributed, withdrawn_amount, start_date, end_date",
      );
    const { data: savingsList } = await applySpaceFilter(
      savingsQuery,
      user.id,
      activeSpaceId,
    );

    let totalSavings = 0;

    if (savingsList) {
      const now = new Date();

      savingsList.forEach(
        (saving: {
          monthly_amount: number;
          contributed: number;
          withdrawn_amount?: number;
          start_date: string;
          end_date: string;
        }) => {
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

        const currentSaved = Math.max(
          0,
          Number(saving.contributed || 0) +
            passedMonths * Number(saving.monthly_amount || 0) -
            Number(saving.withdrawn_amount || 0),
        );

        totalSavings += currentSaved;
        },
      );
    }

    setSummary({
      salary,
      fixedPaid,
      variables,
      savings: totalSavings,
      categoryTotals,
    });
    setHasLoadedData(true);
    setIsLoadingData(false);
    loadInProgressRef.current = false;
  }, [activeSpaceId, selectedMonth]);

  const refreshMonthlySummary = useCallback(async () => {
    try {
      await loadMonthlySummary();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo cargar el resumen.";
      setDataError(message);
      setHasLoadedData(true);
      setIsLoadingData(false);
      loadInProgressRef.current = false;
    }
  }, [loadMonthlySummary]);

  const retryMonthlySummary = useCallback(() => {
    loadInProgressRef.current = false;
    refreshMonthlySummary();
  }, [refreshMonthlySummary]);

  useEffect(() => {
    const init = async () => {
      const user = await getCurrentUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      await refreshMonthlySummary();
    };

    init();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (_, session) => {
        if (session?.user) {
          await refreshMonthlySummary();
        }
      },
    );

    return () => subscription.subscription.unsubscribe();
  }, [refreshMonthlySummary]);

  useFocusEffect(
    useCallback(() => {
      refreshMonthlySummary();
    }, [refreshMonthlySummary]),
  );

  const totalExpenses = summary.fixedPaid + summary.variables;
  const available = summary.salary - totalExpenses;
  const hasVisibleFinanceData =
    summary.salary > 0 ||
    summary.fixedPaid > 0 ||
    summary.variables > 0 ||
    summary.savings > 0 ||
    summary.categoryTotals.length > 0;

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
          <SpaceSwitcher />
          <DataState
            loading={isLoadingData && !hasLoadedData && !hasVisibleFinanceData}
            error={dataError}
            autoRetryMs={2000}
            onRetry={retryMonthlySummary}
          />

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
                Ingresos menos gastos del mes
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
                label={activeSpaceId ? "Ingresos del espacio" : "Sueldo"}
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

          <View style={commonStyles.card}>
            <Text style={commonStyles.cardTitle}>Gasto por categoria</Text>
            <Text style={commonStyles.subtitle}>
              Peso de cada categoria sobre tus ingresos del mes
            </Text>

            <CategoryChart
              items={summary.categoryTotals}
              salary={summary.salary}
              totalExpenses={totalExpenses}
              styles={styles}
            />
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

function CategoryChart({
  items,
  salary,
  totalExpenses,
  styles,
}: {
  items: { category: string; amount: number }[];
  salary: number;
  totalExpenses: number;
  styles: ReturnType<typeof createStyles>;
}) {
  const palette = [
    colors.primaryDark,
    "#0F766E",
    "#2563EB",
    "#7C3AED",
    "#DB2777",
    "#EA580C",
    "#16A34A",
    "#475569",
  ];

  if (items.length === 0) {
    return (
      <View style={styles.emptyChartBox}>
        <Ionicons
          name="pie-chart-outline"
          size={26}
          color={colors.primaryDark}
        />
        <Text style={styles.emptyChartText}>
          Todavia no hay gastos para este mes.
        </Text>
      </View>
    );
  }

  const mainItems = items.slice(0, 5);
  const otherAmount = items
    .slice(5)
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const chartItems =
    otherAmount > 0
      ? [...mainItems, { category: "Otros", amount: otherAmount }]
      : mainItems;
  const totalForChart = Math.max(
    chartItems.reduce((sum, item) => sum + item.amount, 0),
    1,
  );

  let current = 0;
  const gradientStops = chartItems
    .map((item, index) => {
      const start = current;
      const end = current + (item.amount / totalForChart) * 100;
      current = end;
      const color = palette[index % palette.length];
      return `${color} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
    })
    .join(", ");

  return (
    <View style={styles.chartBlock}>
      <View style={styles.chartSummaryRow}>
        <View>
          <Text style={styles.chartSummaryLabel}>Gastado</Text>
          <Text style={styles.chartSummaryValue}>
            {formatCompactMoney(totalExpenses)}
          </Text>
        </View>
        <Text style={styles.chartSummaryPercent}>
          {salary > 0 ? `${Math.round((totalExpenses / salary) * 100)}%` : "0%"}
        </Text>
      </View>

      <View style={styles.donutLayout}>
        <View
          style={[
            styles.donutRing,
            {
              backgroundImage: `conic-gradient(${gradientStops})`,
            } as any,
          ]}
        >
          <View style={styles.donutCenter}>
            <Text style={styles.donutCenterLabel}>Total</Text>
            <Text
              style={styles.donutCenterValue}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.65}
            >
              {formatCompactMoney(totalExpenses)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.legendList}>
        {chartItems.map((item, index) => {
        const percent = salary > 0 ? (item.amount / salary) * 100 : 0;

        return (
          <View key={item.category} style={styles.legendRow}>
            <View
              style={[
                styles.legendDot,
                { backgroundColor: palette[index % palette.length] },
              ]}
            />
            <Text style={styles.legendLabel} numberOfLines={1}>
                {item.category}
              </Text>
            <Text style={styles.legendAmount}>
                {formatCompactMoney(item.amount)} · {percent.toFixed(0)}%
              </Text>
          </View>
        );
      })}
      </View>
    </View>
  );
}

const createStyles = (isDesktop: boolean) =>
  StyleSheet.create({
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

    chartBlock: {
      marginTop: 12,
      gap: 12,
    },

    chartSummaryRow: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 14,
      padding: isDesktop ? 14 : 12,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
    },

    chartSummaryLabel: {
      fontSize: isDesktop ? 12 : 10,
      color: colors.mutedText,
      fontWeight: "800",
      marginBottom: 3,
    },

    chartSummaryValue: {
      fontSize: isDesktop ? 20 : 16,
      color: colors.text,
      fontWeight: "900",
    },

    chartSummaryPercent: {
      fontSize: isDesktop ? 28 : 22,
      color: colors.primaryDark,
      fontWeight: "900",
    },

    donutLayout: {
      alignItems: "center",
      justifyContent: "center",
    },

    donutRing: {
      width: isDesktop ? 188 : 164,
      height: isDesktop ? 188 : 164,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primarySoft,
    },

    donutCenter: {
      width: isDesktop ? 112 : 96,
      height: isDesktop ? 112 : 96,
      borderRadius: 999,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 10,
    },

    donutCenterLabel: {
      fontSize: isDesktop ? 12 : 10,
      color: colors.mutedText,
      fontWeight: "800",
      marginBottom: 3,
    },

    donutCenterValue: {
      maxWidth: "100%",
      fontSize: isDesktop ? 20 : 16,
      color: colors.text,
      fontWeight: "900",
      textAlign: "center",
    },

    legendList: {
      gap: 9,
    },

    legendRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
      backgroundColor: colors.borderSoft,
      borderRadius: 12,
      paddingVertical: isDesktop ? 9 : 8,
      paddingHorizontal: 10,
    },

    legendDot: {
      width: 10,
      height: 10,
      borderRadius: 999,
    },

    legendLabel: {
      flex: 1,
      minWidth: 0,
      fontSize: isDesktop ? 13 : 11,
      color: colors.text,
      fontWeight: "900",
    },

    legendAmount: {
      fontSize: isDesktop ? 12 : 10,
      color: colors.mutedText,
      fontWeight: "800",
      textAlign: "right",
    },

    emptyChartBox: {
      marginTop: 12,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 14,
      paddingVertical: 20,
      paddingHorizontal: 14,
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },

    emptyChartText: {
      fontSize: isDesktop ? 13 : 11,
      color: colors.mutedText,
      fontWeight: "700",
      textAlign: "center",
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
