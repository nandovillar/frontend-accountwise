import { Ionicons } from "@expo/vector-icons";
import { Header } from "@react-navigation/elements";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";

import { AppTextInput } from "@/src/components/AppTextInput";
import { KpiCard } from "@/src/components/KpiCard";
import { ResultRow } from "@/src/components/ResultRow";
import { supabase } from "@/src/lib/supabase";
import { colors } from "@/src/theme/colors";
import { createCommonStyles } from "@/src/theme/commonStyles";
import { getCurrentUser } from "@/src/utils/auth";
import { getNextYearDate, getTodayDate } from "@/src/utils/dates";
import { formatCompactMoney, formatMoney } from "@/src/utils/money";

import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

type SavingItem = {
  id: string;
  user_id: string;
  name: string;
  goal: number;
  start_date: string;
  end_date: string;
  monthly_amount: number;
  contributed: number;
  borrowed?: string;
  created_at?: string;
};

export default function SavingsScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const commonStyles = useMemo(
    () => createCommonStyles(isDesktop),
    [isDesktop],
  );

  const styles = useMemo(() => createStyles(isDesktop), [isDesktop]);

  const [savings, setSavings] = useState<SavingItem[]>([]);
  const [selectedSaving, setSelectedSaving] = useState<SavingItem | null>(null);

  const [formVisible, setFormVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [monthly, setMonthly] = useState("");
  const [contributed, setContributed] = useState("");
  const [borrowed, setBorrowed] = useState("");

  const [startDate, setStartDate] = useState(getTodayDate());
  const [endDate, setEndDate] = useState(getNextYearDate());

  const calculateSaving = (
    startDateValue: string,
    endDateValue: string,
    monthlyValue: number,
    contributedValue: number,
    goalValue: number,
  ) => {
    const now = new Date();
    const start = new Date(startDateValue);
    const end = new Date(endDateValue);

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

    const remainingMonths = Math.max(0, totalMonths - passedMonths);
    const currentSaved = contributedValue + passedMonths * monthlyValue;
    const pending = Math.max(0, goalValue - currentSaved);
    const forecastSaved = contributedValue + totalMonths * monthlyValue;
    const completed = currentSaved >= goalValue && goalValue > 0;

    const neededMonthly =
      remainingMonths > 0 ? Math.max(0, pending / remainingMonths) : 0;

    const progress =
      goalValue > 0 ? Math.min(100, (currentSaved / goalValue) * 100) : 0;

    return {
      totalMonths,
      passedMonths,
      remainingMonths,
      currentSaved,
      pending,
      forecastSaved,
      completed,
      neededMonthly,
      progress,
    };
  };

  const loadSavings = async () => {
    const user = await getCurrentUser();

    if (!user) return;

    const { data, error } = await supabase
      .from("savings")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      Alert.alert("Error", "No se pudieron cargar los ahorros.");
      return;
    }

    setSavings(data || []);
  };

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setGoal("");
    setMonthly("");
    setContributed("");
    setBorrowed("");
    setStartDate(getTodayDate());
    setEndDate(getNextYearDate());
  };

  const openCreateForm = () => {
    resetForm();
    setFormVisible(true);
  };

  const openEditForm = (item: SavingItem) => {
    setEditingId(item.id);
    setName(item.name);
    setGoal(String(item.goal ?? 0));
    setMonthly(String(item.monthly_amount ?? 0));
    setContributed(String(item.contributed ?? 0));
    setBorrowed(item.borrowed || "");
    setStartDate(item.start_date || getTodayDate());
    setEndDate(item.end_date || getNextYearDate());
    setSelectedSaving(null);
    setFormVisible(true);
  };

  const closeForm = () => {
    resetForm();
    setFormVisible(false);
  };

  const saveSaving = async () => {
    const user = await getCurrentUser();

    if (!user) return;

    const payload = {
      user_id: user.id,
      name: name.trim() || "Ahorro sin nombre",
      goal: Number(goal) || 0,
      start_date: startDate,
      end_date: endDate,
      monthly_amount: Number(monthly) || 0,
      contributed: Number(contributed) || 0,
      borrowed: borrowed.trim(),
    };

    if (editingId) {
      const { error } = await supabase
        .from("savings")
        .update(payload)
        .eq("id", editingId)
        .eq("user_id", user.id);

      if (error) {
        Alert.alert("Error", "No se pudo actualizar el ahorro.");
        return;
      }
    } else {
      const { error } = await supabase.from("savings").insert([payload]);

      if (error) {
        Alert.alert("Error", "No se pudo guardar el ahorro.");
        return;
      }
    }

    await loadSavings();
    closeForm();
  };

  const deleteSaving = async (item: SavingItem) => {
    const user = await getCurrentUser();

    if (!user) return;

    const executeDelete = async () => {
      const { error } = await supabase
        .from("savings")
        .delete()
        .eq("id", item.id)
        .eq("user_id", user.id);

      if (error) {
        Alert.alert("Error", "No se pudo eliminar el ahorro.");
        return;
      }

      if (selectedSaving?.id === item.id) {
        setSelectedSaving(null);
      }

      await loadSavings();
    };

    if (Platform.OS === "web") {
      const confirmed = window.confirm(`¿Eliminar "${item.name}"?`);

      if (confirmed) {
        await executeDelete();
      }

      return;
    }

    Alert.alert("Eliminar ahorro", `¿Eliminar "${item.name}"?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: executeDelete },
    ]);
  };

  const getTotals = () => {
    return savings.reduce(
      (acc, item) => {
        const result = calculateSaving(
          item.start_date,
          item.end_date,
          Number(item.monthly_amount || 0),
          Number(item.contributed || 0),
          Number(item.goal || 0),
        );

        return {
          goals: acc.goals + Number(item.goal || 0),
          saved: acc.saved + result.currentSaved,
          pending: acc.pending + result.pending,
        };
      },
      {
        goals: 0,
        saved: 0,
        pending: 0,
      },
    );
  };

  useEffect(() => {
    const init = async () => {
      const user = await getCurrentUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      await loadSavings();
    };

    init();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (_, session) => {
        if (session?.user) {
          await loadSavings();
        }
      },
    );

    return () => subscription.subscription.unsubscribe();
  }, []);

  const totals = getTotals();

  const currentFormResult = calculateSaving(
    startDate,
    endDate,
    Number(monthly) || 0,
    Number(contributed) || 0,
    Number(goal) || 0,
  );

  return (
    <View style={commonStyles.screen}>
      <Header title="Ahorros" />

      <Pressable
        style={commonStyles.settingsButton}
        onPress={() => router.push("/settings")}
      >
        <Text style={commonStyles.settingsButtonText}>☰</Text>
      </Pressable>

      <ScrollView
        contentContainerStyle={commonStyles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={commonStyles.content}>
          <View style={styles.heroCard}>
            <View style={styles.heroTextBlock}>
              <Text style={styles.heroLabel}>Ahorros</Text>

              <Text
                style={styles.heroAmount}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.6}
              >
                {formatCompactMoney(totals.saved)}
              </Text>

              <Text style={styles.heroSubtitle}>
                Ahorrado actualmente entre todos tus objetivos
              </Text>
            </View>

            <View style={styles.heroIcon}>
              <Ionicons name="wallet-outline" size={28} color={colors.white} />
            </View>
          </View>

          <View style={styles.kpiGrid}>
            <KpiCard
              label="Objetivos"
              value={formatCompactMoney(totals.goals)}
              styles={styles}
            />

            <KpiCard
              label="Pendiente"
              value={formatCompactMoney(totals.pending)}
              styles={styles}
            />

            <KpiCard
              label="Planes"
              value={String(savings.length)}
              styles={styles}
            />
          </View>

          <View style={commonStyles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderText}>
                <Text style={commonStyles.smallText}>Listado</Text>
                <Text style={commonStyles.cardTitle}>Mis objetivos</Text>
              </View>

              <Pressable style={styles.addButton} onPress={openCreateForm}>
                <Ionicons name="add" size={21} color={colors.white} />
              </Pressable>
            </View>

            {savings.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons
                  name="wallet-outline"
                  size={28}
                  color={colors.primaryDark}
                />

                <Text style={styles.emptyTitle}>No tienes ahorros todavía</Text>

                <Text style={styles.emptyText}>
                  Crea tu primer objetivo para ver el resumen y el progreso.
                </Text>
              </View>
            ) : (
              savings.map((item) => {
                const result = calculateSaving(
                  item.start_date,
                  item.end_date,
                  Number(item.monthly_amount || 0),
                  Number(item.contributed || 0),
                  Number(item.goal || 0),
                );

                return (
                  <View key={item.id} style={styles.savingRow}>
                    <View style={styles.savingTopRow}>
                      <View style={styles.savingTextBlock}>
                        <Text style={styles.savingName} numberOfLines={1}>
                          {item.name}
                        </Text>

                        <Text style={styles.savingStatus}>
                          {result.completed ? "Cumplido" : "En progreso"} ·{" "}
                          {result.progress.toFixed(0)}%
                        </Text>
                      </View>

                      <Text
                        style={styles.savingAmount}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.65}
                      >
                        {formatCompactMoney(result.currentSaved)}
                      </Text>
                    </View>

                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${result.progress}%` },
                        ]}
                      />
                    </View>

                    <View style={styles.infoLine}>
                      <InfoPill
                        label="Objetivo"
                        value={formatCompactMoney(Number(item.goal || 0))}
                      />

                      <InfoPill
                        label="Mensual"
                        value={formatCompactMoney(
                          Number(item.monthly_amount || 0),
                        )}
                      />

                      <InfoPill
                        label="Pendiente"
                        value={formatCompactMoney(result.pending)}
                      />
                    </View>

                    <View style={styles.actionsRowRight}>
                      <Pressable
                        style={styles.iconButton}
                        onPress={() => setSelectedSaving(item)}
                      >
                        <Ionicons
                          name="eye-outline"
                          size={18}
                          color={colors.primaryDark}
                        />
                      </Pressable>

                      <Pressable
                        style={styles.iconButton}
                        onPress={() => openEditForm(item)}
                      >
                        <Ionicons
                          name="create-outline"
                          size={18}
                          color={colors.primaryDark}
                        />
                      </Pressable>

                      <Pressable
                        style={styles.deleteIconButton}
                        onPress={() => deleteSaving(item)}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={18}
                          color="#B91C1C"
                        />
                      </Pressable>
                    </View>
                  </View>
                );
              })
            )}
          </View>

          <Pressable
            style={[commonStyles.secondaryButton, styles.homeButton]}
            onPress={() => router.push("/HomePurchase")}
          >
            <Ionicons
              name="home-outline"
              size={18}
              color={colors.primaryDark}
            />

            <Text style={commonStyles.secondaryButtonText}>
              Simulador de casa
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal
        visible={formVisible}
        transparent
        animationType="fade"
        onRequestClose={closeForm}
      >
        <View style={commonStyles.modalOverlay}>
          <View style={commonStyles.modalCard}>
            <View style={commonStyles.modalHeader}>
              <View style={commonStyles.modalTitleBlock}>
                <Text style={commonStyles.modalTitle}>
                  {editingId ? "Editar ahorro" : "Nuevo ahorro"}
                </Text>

                <Text style={commonStyles.modalSubtitle}>
                  Si cancelas, no se guarda ningún cambio
                </Text>
              </View>

              <Pressable style={commonStyles.closeButton} onPress={closeForm}>
                <Ionicons name="close" size={22} color={colors.primaryDark} />
              </Pressable>
            </View>

            <ScrollView
              style={commonStyles.modalScroll}
              keyboardShouldPersistTaps="handled"
            >
              <AppTextInput
                label="Nombre del ahorro"
                value={name}
                onChange={setName}
                keyboardType="default"
                commonStyles={commonStyles}
              />

              <AppTextInput
                label="Objetivo (€)"
                value={goal}
                onChange={setGoal}
                commonStyles={commonStyles}
              />

              <View style={styles.dateGrid}>
                <View style={styles.dateColumn}>
                  <AppTextInput
                    label="Fecha inicio"
                    value={startDate}
                    onChange={setStartDate}
                    keyboardType="default"
                    commonStyles={commonStyles}
                  />
                </View>

                <View style={styles.dateColumn}>
                  <AppTextInput
                    label="Fecha fin"
                    value={endDate}
                    onChange={setEndDate}
                    keyboardType="default"
                    commonStyles={commonStyles}
                  />
                </View>
              </View>

              <AppTextInput
                label="Ahorro mensual (€)"
                value={monthly}
                onChange={setMonthly}
                commonStyles={commonStyles}
              />

              <AppTextInput
                label="Aportado hasta ahora (€)"
                value={contributed}
                onChange={setContributed}
                commonStyles={commonStyles}
              />

              <AppTextInput
                label="Prestado / notas"
                value={borrowed}
                onChange={setBorrowed}
                keyboardType="default"
                commonStyles={commonStyles}
              />

              <View style={styles.summaryBox}>
                <Text style={styles.summaryTitle}>Resumen</Text>

                <ResultRow
                  label="Objetivo"
                  value={formatMoney(Number(goal) || 0)}
                  styles={styles}
                />

                <ResultRow
                  label="Ahorro actual"
                  value={formatMoney(currentFormResult.currentSaved)}
                  styles={styles}
                />

                <ResultRow
                  label="Pendiente"
                  value={formatMoney(currentFormResult.pending)}
                  strong
                  styles={styles}
                />

                <ResultRow
                  label="Mensual necesario"
                  value={formatMoney(currentFormResult.neededMonthly)}
                  styles={styles}
                />
              </View>
            </ScrollView>

            <View style={commonStyles.modalActions}>
              <Pressable
                style={commonStyles.modalCancelButton}
                onPress={closeForm}
              >
                <Text style={commonStyles.modalCancelText}>Cancelar</Text>
              </Pressable>

              <Pressable
                style={commonStyles.modalSaveButton}
                onPress={saveSaving}
              >
                <Text style={commonStyles.modalSaveText}>
                  {editingId ? "Guardar cambios" : "Guardar"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!selectedSaving}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedSaving(null)}
      >
        <View style={commonStyles.modalOverlay}>
          <View style={commonStyles.modalCardSmall}>
            <View style={commonStyles.modalHeader}>
              <View style={commonStyles.modalTitleBlock}>
                <Text style={commonStyles.modalTitle}>
                  {selectedSaving?.name}
                </Text>

                <Text style={commonStyles.modalSubtitle}>
                  Detalle del objetivo
                </Text>
              </View>

              <Pressable
                style={commonStyles.closeButton}
                onPress={() => setSelectedSaving(null)}
              >
                <Ionicons name="close" size={22} color={colors.primaryDark} />
              </Pressable>
            </View>

            {selectedSaving &&
              (() => {
                const result = calculateSaving(
                  selectedSaving.start_date,
                  selectedSaving.end_date,
                  Number(selectedSaving.monthly_amount || 0),
                  Number(selectedSaving.contributed || 0),
                  Number(selectedSaving.goal || 0),
                );

                return (
                  <View>
                    <View style={styles.detailHero}>
                      <Text style={styles.detailHeroLabel}>Ahorrado</Text>

                      <Text
                        style={styles.detailHeroAmount}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.65}
                      >
                        {formatCompactMoney(result.currentSaved)}
                      </Text>

                      <Text style={styles.detailHeroSubtitle}>
                        {result.progress.toFixed(0)}% del objetivo
                      </Text>
                    </View>

                    <ResultRow
                      label="Objetivo"
                      value={formatMoney(Number(selectedSaving.goal || 0))}
                      styles={styles}
                    />

                    <ResultRow
                      label="Pendiente"
                      value={formatMoney(result.pending)}
                      strong
                      styles={styles}
                    />

                    <ResultRow
                      label="Ahorro mensual"
                      value={formatMoney(
                        Number(selectedSaving.monthly_amount || 0),
                      )}
                      styles={styles}
                    />

                    <ResultRow
                      label="Mensual necesario"
                      value={formatMoney(result.neededMonthly)}
                      styles={styles}
                    />

                    <ResultRow
                      label="Meses restantes"
                      value={String(result.remainingMonths)}
                      styles={styles}
                    />

                    <ResultRow
                      label="Estado"
                      value={result.completed ? "Cumplido" : "En progreso"}
                      styles={styles}
                    />

                    <View style={commonStyles.modalActions}>
                      <Pressable
                        style={commonStyles.secondaryButton}
                        onPress={() => openEditForm(selectedSaving)}
                      >
                        <Ionicons
                          name="create-outline"
                          size={18}
                          color={colors.primaryDark}
                        />

                        <Text style={commonStyles.secondaryButtonText}>
                          Editar
                        </Text>
                      </Pressable>

                      <Pressable
                        style={commonStyles.dangerButton}
                        onPress={() => deleteSaving(selectedSaving)}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={18}
                          color="#B91C1C"
                        />

                        <Text style={commonStyles.dangerButtonText}>
                          Eliminar
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })()}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={infoPillStyles.pill}>
      <Text style={infoPillStyles.pillLabel}>{label}</Text>

      <Text
        style={infoPillStyles.pillValue}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.65}
      >
        {value}
      </Text>
    </View>
  );
}

const infoPillStyles = StyleSheet.create({
  pill: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 7,
    paddingHorizontal: 7,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },

  pillLabel: {
    fontSize: 9,
    color: colors.mutedText,
    fontWeight: "800",
    marginBottom: 2,
  },

  pillValue: {
    width: "100%",
    fontSize: 10,
    color: colors.text,
    fontWeight: "900",
  },
});

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
      minHeight: isDesktop ? 132 : 112,
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

    heroAmount: {
      fontSize: isDesktop ? 34 : 28,
      color: colors.white,
      fontWeight: "900",
    },

    heroSubtitle: {
      fontSize: isDesktop ? 13 : 11,
      color: colors.white,
      opacity: 0.85,
      fontWeight: "600",
      marginTop: 4,
    },

    heroIcon: {
      width: isDesktop ? 58 : 48,
      height: isDesktop ? 58 : 48,
      borderRadius: 999,
      backgroundColor: "rgba(255,255,255,0.16)",
      alignItems: "center",
      justifyContent: "center",
    },

    kpiGrid: {
      flexDirection: "row",
      gap: isDesktop ? 10 : 6,
      marginBottom: isDesktop ? 14 : 12,
    },

    kpiCard: {
      flex: 1,
      minWidth: 0,
      backgroundColor: colors.surface,
      borderRadius: isDesktop ? 16 : 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: isDesktop ? 15 : 9,
      paddingHorizontal: isDesktop ? 15 : 8,
    },

    kpiLabel: {
      fontSize: isDesktop ? 12 : 9,
      color: colors.mutedText,
      fontWeight: "800",
      marginBottom: 4,
    },

    kpiValue: {
      fontSize: isDesktop ? 19 : 14,
      color: colors.text,
      fontWeight: "900",
    },

    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      marginBottom: 14,
    },

    cardHeaderText: {
      flex: 1,
      minWidth: 0,
    },

    addButton: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: colors.primaryDark,
      alignItems: "center",
      justifyContent: "center",
    },

    emptyBox: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: isDesktop ? 30 : 22,
      paddingHorizontal: 14,
      backgroundColor: colors.background,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.borderSoft,
    },

    emptyTitle: {
      fontSize: isDesktop ? 16 : 14,
      color: colors.text,
      fontWeight: "900",
      marginTop: 10,
      marginBottom: 4,
      textAlign: "center",
    },

    emptyText: {
      fontSize: isDesktop ? 13 : 11,
      color: colors.mutedText,
      textAlign: "center",
      fontWeight: "600",
    },

    savingRow: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: 16,
      padding: isDesktop ? 14 : 12,
      marginBottom: 10,
    },

    savingTopRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 12,
      marginBottom: 10,
    },

    savingTextBlock: {
      flex: 1,
      minWidth: 0,
    },

    savingName: {
      fontSize: isDesktop ? 15 : 13,
      fontWeight: "900",
      color: colors.text,
      marginBottom: 2,
    },

    savingStatus: {
      fontSize: isDesktop ? 12 : 10,
      color: colors.mutedText,
      fontWeight: "700",
    },

    savingAmount: {
      maxWidth: isDesktop ? 180 : 120,
      fontSize: isDesktop ? 18 : 15,
      fontWeight: "900",
      color: colors.primaryDark,
      textAlign: "right",
    },

    progressTrack: {
      height: 8,
      backgroundColor: colors.borderSoft,
      borderRadius: 999,
      overflow: "hidden",
      marginBottom: 10,
    },

    progressFill: {
      height: "100%",
      backgroundColor: colors.primaryDark,
      borderRadius: 999,
    },

    infoLine: {
      flexDirection: "row",
      gap: isDesktop ? 8 : 5,
      marginBottom: 10,
    },

    actionsRowRight: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 8,
    },

    iconButton: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: colors.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },

    deleteIconButton: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: "#FEF2F2",
      alignItems: "center",
      justifyContent: "center",
    },

    homeButton: {
      marginBottom: 14,
    },

    dateGrid: {
      flexDirection: isDesktop ? "row" : "column",
      gap: isDesktop ? 12 : 0,
    },

    dateColumn: {
      flex: 1,
    },

    summaryBox: {
      backgroundColor: colors.background,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      padding: isDesktop ? 14 : 12,
      marginTop: 6,
    },

    summaryTitle: {
      fontSize: isDesktop ? 15 : 13,
      color: colors.text,
      fontWeight: "900",
      marginBottom: 8,
    },

    resultRow: {
      paddingVertical: isDesktop ? 10 : 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderSoft,
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 12,
    },

    resultLabel: {
      flex: 1,
      fontSize: isDesktop ? 13 : 11,
      color: colors.mutedText,
      fontWeight: "800",
    },

    resultValue: {
      flexShrink: 1,
      maxWidth: "55%",
      fontSize: isDesktop ? 13 : 11,
      color: colors.text,
      fontWeight: "800",
      textAlign: "right",
    },

    resultValueStrong: {
      fontSize: isDesktop ? 14 : 12,
      fontWeight: "900",
      color: colors.primaryDark,
    },

    detailHero: {
      backgroundColor: colors.primaryDark,
      borderRadius: 16,
      padding: isDesktop ? 18 : 14,
      marginBottom: 14,
    },

    detailHeroLabel: {
      fontSize: isDesktop ? 12 : 10,
      color: colors.white,
      opacity: 0.85,
      fontWeight: "800",
      marginBottom: 4,
    },

    detailHeroAmount: {
      fontSize: isDesktop ? 28 : 24,
      color: colors.white,
      fontWeight: "900",
    },

    detailHeroSubtitle: {
      fontSize: isDesktop ? 13 : 11,
      color: colors.white,
      opacity: 0.85,
      fontWeight: "700",
      marginTop: 4,
    },
  });
