import { Ionicons } from "@expo/vector-icons";
import { Header } from "@react-navigation/elements";
import { router } from "expo-router";
import { useEffect, useState } from "react";

import { supabase } from "@/src/lib/supabase";
import { colors } from "@/src/theme/colors";

import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type Saving = {
  id: string;
  user_id: string;
  name: string;
  goal: number;
  start_date: string;
  end_date: string;
  monthly_amount: number;
  contributed: number;
  borrowed: string | null;
  created_at?: string;
};

const defaultStartDate = "2026-05-01";
const defaultEndDate = "2026-12-01";

export default function SavingsScreen() {
  const [savings, setSavings] = useState<Saving[]>([]);
  const [selectedSaving, setSelectedSaving] = useState<Saving | null>(null);

  const [formVisible, setFormVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [monthly, setMonthly] = useState("");
  const [contributed, setContributed] = useState("");
  const [borrowedValue, setBorrowedValue] = useState("");

  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);

  const toNumber = (value: string | number) => {
    return Number(String(value).replace(",", ".")) || 0;
  };

  const formatMoney = (value: number) => {
    return `${value.toLocaleString("es-ES", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} €`;
  };

  const getCurrentUser = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.user ?? null;
  };

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
        (end.getMonth() - start.getMonth()) +
        1,
    );

    const passedMonths =
      now < start
        ? 0
        : Math.min(
            totalMonths,
            (now.getFullYear() - start.getFullYear()) * 12 +
              (now.getMonth() - start.getMonth()) +
              1,
          );

    const remainingMonths = Math.max(0, totalMonths - passedMonths);

    const currentSaved = contributedValue + passedMonths * monthlyValue;
    const pending = Math.max(0, goalValue - currentSaved);

    const neededMonthly =
      remainingMonths > 0 ? pending / remainingMonths : pending;

    const forecastSaved = contributedValue + totalMonths * monthlyValue;
    const completed = currentSaved >= goalValue && goalValue > 0;

    return {
      totalMonths,
      passedMonths,
      remainingMonths,
      currentSaved,
      neededMonthly,
      pending,
      forecastSaved,
      completed,
    };
  };

  const totals = savings.reduce(
    (acc, item) => {
      const result = calculateSaving(
        item.start_date,
        item.end_date,
        Number(item.monthly_amount || 0),
        Number(item.contributed || 0),
        Number(item.goal || 0),
      );

      return {
        goal: acc.goal + Number(item.goal || 0),
        current: acc.current + result.currentSaved,
        pending: acc.pending + result.pending,
      };
    },
    { goal: 0, current: 0, pending: 0 },
  );

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setGoal("");
    setMonthly("");
    setContributed("");
    setBorrowedValue("");
    setStartDate(defaultStartDate);
    setEndDate(defaultEndDate);
  };

  const openCreateForm = () => {
    resetForm();
    setSelectedSaving(null);
    setFormVisible(true);
  };

  const openEditForm = (item: Saving) => {
    setSelectedSaving(null);

    setEditingId(item.id);
    setName(item.name || "");
    setGoal(String(item.goal || ""));
    setMonthly(String(item.monthly_amount || ""));
    setContributed(String(item.contributed || ""));
    setBorrowedValue(item.borrowed || "");
    setStartDate(item.start_date || defaultStartDate);
    setEndDate(item.end_date || defaultEndDate);

    setFormVisible(true);
  };

  const closeForm = () => {
    resetForm();
    setFormVisible(false);
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

  const saveSaving = async () => {
    const user = await getCurrentUser();

    if (!user) return;

    if (!goal || !monthly) {
      Alert.alert(
        "Faltan datos",
        "Rellena al menos objetivo y ahorro mensual.",
      );
      return;
    }

    const payload = {
      user_id: user.id,
      name: name.trim() || "Ahorro sin nombre",
      goal: toNumber(goal),
      start_date: startDate,
      end_date: endDate,
      monthly_amount: toNumber(monthly),
      contributed: toNumber(contributed),
      borrowed: borrowedValue,
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

  const deleteSaving = async (item: Saving) => {
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
      if (confirmed) await executeDelete();
      return;
    }

    Alert.alert("Eliminar ahorro", `¿Eliminar "${item.name}"?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: executeDelete },
    ]);
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

      await loadSavings();
    };

    checkSession();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (_, session) => {
        if (session?.user) {
          await loadSavings();
        }
      },
    );

    return () => subscription.subscription.unsubscribe();
  }, []);

  return (
    <View style={styles.screen}>
      <Header title="Ahorro" />

      <Pressable
        style={styles.settingsButton}
        onPress={() => router.push("/settings")}
      >
        <Text style={styles.settingsButtonText}>☰</Text>
      </Pressable>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.content}>
          <View style={styles.heroCard}>
            <View style={styles.heroTextBlock}>
              <Text style={styles.heroLabel}>Ahorros totales</Text>

              <Text
                style={styles.heroAmount}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {formatMoney(totals.current)}
              </Text>

              <Text
                style={styles.heroSubtitle}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                Pendiente: {formatMoney(totals.pending)}
              </Text>
            </View>

            <View style={styles.heroIconBox}>
              <Ionicons name="wallet-outline" size={28} color={colors.white} />
            </View>
          </View>

          <View style={styles.kpiGrid}>
            <KpiCard label="Objetivo" value={formatMoney(totals.goal)} />
            <KpiCard label="Actual" value={formatMoney(totals.current)} />
            <KpiCard label="Pendiente" value={formatMoney(totals.pending)} />
          </View>

          <View style={styles.actionsCard}>
            <Pressable style={styles.primaryButton} onPress={openCreateForm}>
              <Ionicons
                name="add-circle-outline"
                size={18}
                color={colors.white}
              />
              <Text style={styles.primaryButtonText}>Nuevo ahorro</Text>
            </Pressable>

            <Pressable
              style={styles.secondaryButton}
              onPress={() => router.push("/HomePurchase")}
            >
              <Ionicons
                name="home-outline"
                size={18}
                color={colors.primaryDark}
              />
              <Text style={styles.secondaryButtonText}>Simulador casa</Text>
            </Pressable>
          </View>

          {selectedSaving && (
            <View style={styles.detailCard}>
              <View style={styles.detailHeader}>
                <View>
                  <Text style={styles.detailTitle}>{selectedSaving.name}</Text>
                  <Text style={styles.detailSubtitle}>
                    Detalle del objetivo
                  </Text>
                </View>

                <Pressable
                  style={styles.iconButtonSoft}
                  onPress={() => setSelectedSaving(null)}
                >
                  <Ionicons name="close" size={20} color={colors.primaryDark} />
                </Pressable>
              </View>

              {(() => {
                const result = calculateSaving(
                  selectedSaving.start_date,
                  selectedSaving.end_date,
                  Number(selectedSaving.monthly_amount || 0),
                  Number(selectedSaving.contributed || 0),
                  Number(selectedSaving.goal || 0),
                );

                return (
                  <View style={styles.resultBox}>
                    <ResultRow
                      label="Objetivo"
                      value={formatMoney(Number(selectedSaving.goal || 0))}
                    />
                    <ResultRow
                      label="Ahorro actual"
                      value={formatMoney(result.currentSaved)}
                    />
                    <ResultRow
                      label="Pendiente"
                      value={formatMoney(result.pending)}
                    />
                    <ResultRow
                      label="Ahorro mensual"
                      value={formatMoney(
                        Number(selectedSaving.monthly_amount || 0),
                      )}
                    />
                    <ResultRow
                      label="Necesario mensual"
                      value={formatMoney(result.neededMonthly)}
                    />
                    <ResultRow
                      label="Meses restantes"
                      value={`${result.remainingMonths}`}
                    />
                    <ResultRow
                      label="Estado"
                      value={result.completed ? "Cumplido" : "En progreso"}
                      strong
                    />
                  </View>
                );
              })()}
            </View>
          )}

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Mis ahorros</Text>
                <Text style={styles.sectionSubtitle}>
                  {savings.length} objetivos guardados
                </Text>
              </View>
            </View>

            {savings.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons
                  name="file-tray-outline"
                  size={28}
                  color={colors.mutedText}
                />
                <Text style={styles.emptyTitle}>No tienes ahorros todavía</Text>
                <Text style={styles.emptyText}>
                  Crea tu primer objetivo para ver el progreso aquí.
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

                const progress =
                  Number(item.goal || 0) > 0
                    ? Math.min(
                        100,
                        (result.currentSaved / Number(item.goal)) * 100,
                      )
                    : 0;

                return (
                  <View key={item.id} style={styles.savingRow}>
                    <Pressable
                      style={styles.savingMain}
                      onPress={() => setSelectedSaving(item)}
                    >
                      <View style={styles.savingTopLine}>
                        <Text style={styles.savingName} numberOfLines={1}>
                          {item.name}
                        </Text>

                        <Text
                          style={styles.savingAmount}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.75}
                        >
                          {formatMoney(result.currentSaved)}
                        </Text>
                      </View>

                      <Text
                        style={styles.savingMeta}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.8}
                      >
                        Objetivo {formatMoney(Number(item.goal || 0))} ·{" "}
                        {progress.toFixed(0)}%
                      </Text>

                      <View style={styles.progressTrack}>
                        <View
                          style={[
                            styles.progressFill,
                            { width: `${progress}%` },
                          ]}
                        />
                      </View>
                    </Pressable>

                    <View style={styles.rowActions}>
                      <Pressable
                        style={styles.iconButtonSoft}
                        onPress={() => setSelectedSaving(item)}
                      >
                        <Ionicons
                          name="eye-outline"
                          size={18}
                          color={colors.primaryDark}
                        />
                      </Pressable>

                      <Pressable
                        style={styles.iconButtonSoft}
                        onPress={() => openEditForm(item)}
                      >
                        <Ionicons
                          name="create-outline"
                          size={18}
                          color={colors.primaryDark}
                        />
                      </Pressable>

                      <Pressable
                        style={styles.iconButtonDanger}
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
        </View>
      </ScrollView>

      <Modal
        visible={formVisible}
        transparent
        animationType="fade"
        onRequestClose={closeForm}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {editingId ? "Editar ahorro" : "Nuevo ahorro"}
                </Text>
                <Text style={styles.modalSubtitle}>
                  Completa los datos del objetivo
                </Text>
              </View>

              <Pressable style={styles.closeButton} onPress={closeForm}>
                <Ionicons name="close" size={22} color={colors.primaryDark} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.modalScroll}
              keyboardShouldPersistTaps="handled"
            >
              <Input
                label="Nombre del ahorro"
                value={name}
                onChange={setName}
                keyboardType="default"
                placeholder="Ej: Verano"
              />

              <Input
                label="Objetivo (€)"
                value={goal}
                onChange={setGoal}
                placeholder="Ej: 1500"
              />

              <Input
                label="Fecha inicio"
                value={startDate}
                onChange={setStartDate}
                keyboardType="default"
                placeholder="YYYY-MM-DD"
              />

              <Input
                label="Fecha fin"
                value={endDate}
                onChange={setEndDate}
                keyboardType="default"
                placeholder="YYYY-MM-DD"
              />

              <Input
                label="Ahorro mensual (€)"
                value={monthly}
                onChange={setMonthly}
                placeholder="Ej: 200"
              />

              <Input
                label="Aportado (€)"
                value={contributed}
                onChange={setContributed}
                placeholder="Ej: 500"
              />

              <Input
                label="Prestado"
                value={borrowedValue}
                onChange={setBorrowedValue}
                keyboardType="default"
                placeholder="Opcional"
              />

              {(() => {
                const result = calculateSaving(
                  startDate,
                  endDate,
                  toNumber(monthly),
                  toNumber(contributed),
                  toNumber(goal),
                );

                return (
                  <View style={styles.previewBox}>
                    <ResultRow
                      label="Objetivo"
                      value={formatMoney(toNumber(goal))}
                    />
                    <ResultRow
                      label="Ahorro actual"
                      value={formatMoney(result.currentSaved)}
                    />
                    <ResultRow
                      label="Pendiente"
                      value={formatMoney(result.pending)}
                    />
                    <ResultRow
                      label="Necesario mensual"
                      value={formatMoney(result.neededMonthly)}
                    />
                    <ResultRow
                      label="Estado"
                      value={result.completed ? "Cumplido" : "En progreso"}
                      strong
                    />
                  </View>
                );
              })()}
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancelButton} onPress={closeForm}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </Pressable>

              <Pressable style={styles.modalSaveButton} onPress={saveSaving}>
                <Text style={styles.modalSaveText}>
                  {editingId ? "Guardar cambios" : "Guardar ahorro"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.kpiCard}>
      <Text style={styles.kpiLabel}>{label}</Text>

      <Text
        style={styles.kpiValue}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
      >
        {value}
      </Text>
    </View>
  );
}

function ResultRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <View style={styles.resultRow}>
      <Text style={styles.resultLabel}>{label}</Text>
      <Text
        style={[styles.resultValue, strong && styles.resultValueStrong]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
      >
        {value}
      </Text>
    </View>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  keyboardType = "numeric",
}: {
  label: string;
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
  keyboardType?: "numeric" | "default";
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>

      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        keyboardType={keyboardType}
        placeholderTextColor={colors.mutedText}
      />
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
    padding: isWeb ? 28 : 14,
    paddingBottom: 36,
    alignItems: "center",
  },

  content: {
    width: "100%",
    maxWidth: 940,
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
    zIndex: 20,
  },

  settingsButtonText: {
    fontSize: isWeb ? 22 : 20,
    lineHeight: 24,
    color: colors.text,
    fontWeight: "900",
  },

  heroCard: {
    backgroundColor: colors.primaryDark,
    borderRadius: 20,
    padding: isWeb ? 22 : 18,
    marginBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 14,
  },

  heroTextBlock: {
    flex: 1,
    minWidth: 0,
  },

  heroLabel: {
    fontSize: isWeb ? 13 : 11,
    color: colors.white,
    opacity: 0.85,
    fontWeight: "800",
    marginBottom: 5,
  },

  heroAmount: {
    fontSize: isWeb ? 34 : 29,
    color: colors.white,
    fontWeight: "900",
  },

  heroSubtitle: {
    fontSize: isWeb ? 13 : 11,
    color: colors.white,
    opacity: 0.9,
    marginTop: 4,
  },

  heroIconBox: {
    width: isWeb ? 56 : 48,
    height: isWeb ? 56 : 48,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },

  kpiGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },

  kpiCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: isWeb ? 15 : 12,
  },

  kpiLabel: {
    fontSize: isWeb ? 12 : 10,
    color: colors.mutedText,
    fontWeight: "800",
    marginBottom: 5,
  },

  kpiValue: {
    fontSize: isWeb ? 19 : 16,
    color: colors.text,
    fontWeight: "900",
  },

  actionsCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    marginBottom: 14,
    flexDirection: isWeb ? "row" : "column",
    gap: 8,
  },

  primaryButton: {
    flex: 1,
    backgroundColor: colors.primaryDark,
    borderRadius: 12,
    padding: isWeb ? 12 : 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },

  primaryButtonText: {
    color: colors.white,
    fontSize: isWeb ? 13 : 11,
    fontWeight: "900",
  },

  secondaryButton: {
    flex: 1,
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    padding: isWeb ? 12 : 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },

  secondaryButtonText: {
    color: colors.primaryDark,
    fontSize: isWeb ? 13 : 11,
    fontWeight: "900",
  },

  detailCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: isWeb ? 16 : 13,
    marginBottom: 14,
  },

  detailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },

  detailTitle: {
    fontSize: isWeb ? 18 : 15,
    fontWeight: "900",
    color: colors.text,
  },

  detailSubtitle: {
    fontSize: isWeb ? 12 : 10,
    color: colors.mutedText,
    marginTop: 3,
  },

  resultBox: {
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: 14,
    overflow: "hidden",
  },

  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: isWeb ? 16 : 13,
    marginBottom: 14,
  },

  sectionHeader: {
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: isWeb ? 18 : 16,
    fontWeight: "900",
    color: colors.text,
  },

  sectionSubtitle: {
    fontSize: isWeb ? 12 : 10,
    color: colors.mutedText,
    marginTop: 3,
  },

  emptyBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 28,
    gap: 6,
  },

  emptyTitle: {
    fontSize: isWeb ? 15 : 13,
    fontWeight: "900",
    color: colors.text,
  },

  emptyText: {
    fontSize: isWeb ? 12 : 10,
    color: colors.mutedText,
    textAlign: "center",
  },

  savingRow: {
    backgroundColor: "#F8FCFD",
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: 14,
    padding: isWeb ? 12 : 10,
    marginBottom: 10,
  },

  savingMain: {
    marginBottom: 10,
  },

  savingTopLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "center",
  },

  savingName: {
    flex: 1,
    fontSize: isWeb ? 15 : 13,
    fontWeight: "800",
    color: colors.text,
  },

  savingAmount: {
    maxWidth: "45%",
    fontSize: isWeb ? 15 : 13,
    fontWeight: "900",
    color: colors.primaryDark,
    textAlign: "right",
  },

  savingMeta: {
    fontSize: isWeb ? 12 : 10,
    color: colors.mutedText,
    marginTop: 4,
    marginBottom: 8,
  },

  progressTrack: {
    height: 8,
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    backgroundColor: colors.primaryDark,
    borderRadius: 999,
  },

  rowActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 6,
  },

  iconButtonSoft: {
    width: isWeb ? 34 : 30,
    height: isWeb ? 34 : 30,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },

  iconButtonDanger: {
    width: isWeb ? 34 : 30,
    height: isWeb ? 34 : 30,
    borderRadius: 10,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
  },

  resultRow: {
    paddingVertical: isWeb ? 11 : 9,
    paddingHorizontal: isWeb ? 12 : 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },

  resultLabel: {
    flex: 1,
    fontSize: isWeb ? 13 : 11,
    color: colors.mutedText,
    fontWeight: "800",
  },

  resultValue: {
    flexShrink: 1,
    fontSize: isWeb ? 13 : 11,
    color: colors.text,
    fontWeight: "800",
    textAlign: "right",
  },

  resultValueStrong: {
    fontWeight: "900",
    color: colors.primaryDark,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 18,
  },

  modalCard: {
    width: "100%",
    maxWidth: 520,
    maxHeight: "88%",
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: isWeb ? 20 : 16,
    borderWidth: 1,
    borderColor: colors.border,
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 14,
  },

  modalTitle: {
    fontSize: isWeb ? 20 : 17,
    fontWeight: "900",
    color: colors.text,
  },

  modalSubtitle: {
    fontSize: isWeb ? 13 : 11,
    color: colors.mutedText,
    marginTop: 3,
  },

  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },

  modalScroll: {
    maxHeight: isWeb ? 430 : 390,
  },

  inputGroup: {
    marginBottom: 11,
  },

  inputLabel: {
    fontSize: isWeb ? 13 : 11,
    color: colors.mutedText,
    fontWeight: "800",
    marginBottom: 5,
  },

  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 11,
    paddingVertical: isWeb ? 11 : 9,
    paddingHorizontal: 11,
    fontSize: isWeb ? 14 : 12,
    color: colors.text,
  },

  previewBox: {
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 4,
  },

  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },

  modalCancelButton: {
    flex: 1,
    backgroundColor: colors.primarySoft,
    padding: isWeb ? 12 : 10,
    borderRadius: 11,
    alignItems: "center",
  },

  modalCancelText: {
    color: colors.primaryDark,
    fontSize: isWeb ? 13 : 11,
    fontWeight: "900",
  },

  modalSaveButton: {
    flex: 1,
    backgroundColor: colors.primaryDark,
    padding: isWeb ? 12 : 10,
    borderRadius: 11,
    alignItems: "center",
  },

  modalSaveText: {
    color: colors.white,
    fontSize: isWeb ? 13 : 11,
    fontWeight: "900",
  },
});
