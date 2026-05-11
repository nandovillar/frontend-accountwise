import { supabase } from "@/src/lib/supabase";
import { colors } from "@/src/theme/colors";
import { Header } from "@react-navigation/elements";
import { router } from "expo-router";
import { useEffect, useState } from "react";

import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export default function SavingsScreen() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [savings, setSavings] = useState<any[]>([]);
  const [selectedSaving, setSelectedSaving] = useState<any | null>(null);

  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [monthly, setMonthly] = useState("");
  const [contributed, setContributed] = useState("");
  const [borrowed, setBorrowed] = useState("");

  const [startDate, setStartDate] = useState("2026-05-01");
  const [endDate, setEndDate] = useState("2026-12-01");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editGoal, setEditGoal] = useState("");
  const [editMonthly, setEditMonthly] = useState("");
  const [editContributed, setEditContributed] = useState("");
  const [editBorrowed, setEditBorrowed] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");

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

    const passedMonths =
      now < start
        ? 0
        : Math.min(
            totalMonths,
            (now.getFullYear() - start.getFullYear()) * 12 +
              (now.getMonth() - start.getMonth()),
          );

    const remainingMonths = Math.max(0, totalMonths - passedMonths);
    const ahorradoActual = contributedValue + passedMonths * monthlyValue;
    const pendiente = goalValue - ahorradoActual;
    const ahorroMensual =
      remainingMonths > 0 ? pendiente / remainingMonths : pendiente;
    const completed = ahorradoActual >= goalValue;
    const pronosticoAhorrado = contributedValue + totalMonths * monthlyValue;

    return {
      totalMonths,
      passedMonths,
      remainingMonths,
      ahorradoActual,
      ahorroMensual,
      pendiente,
      completed,
      pronosticoAhorrado,
      objetivo: goalValue,
    };
  };

  const loadSavings = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data } = await supabase
      .from("savings")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setSavings(data || []);
  };

  const loadProfile = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .single();
  };

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        setTimeout(checkSession, 200);
        return;
      }

      await loadProfile();
      await loadSavings();
    };

    checkSession();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (_, session) => {
        if (session?.user) {
          await loadProfile();
          await loadSavings();
        }
      },
    );

    return () => subscription.subscription.unsubscribe();
  }, []);

  const resetCreateForm = () => {
    setName("");
    setGoal("");
    setMonthly("");
    setContributed("");
    setBorrowed("");
    setStartDate("2026-05-01");
    setEndDate("2026-12-01");
  };

  const resetEditForm = () => {
    setEditingId(null);
    setEditName("");
    setEditGoal("");
    setEditMonthly("");
    setEditContributed("");
    setEditBorrowed("");
    setEditStartDate("");
    setEditEndDate("");
  };

  const saveNewSaving = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    if (!goal || !monthly) return;

    const payload = {
      user_id: user.id,
      name: name || "Ahorro sin nombre",
      goal: Number(goal),
      start_date: startDate,
      end_date: endDate,
      monthly_amount: Number(monthly),
      contributed: Number(contributed || 0),
      borrowed,
    };

    await supabase.from("savings").insert([payload]);

    await loadSavings();
    resetCreateForm();
    setShowCreateForm(false);
  };

  const startEditSaving = (item: any) => {
    setEditingId(item.id);
    setEditName(item.name || "");
    setEditGoal(String(item.goal || ""));
    setEditMonthly(String(item.monthly_amount || ""));
    setEditContributed(String(item.contributed || ""));
    setEditBorrowed(item.borrowed || "");
    setEditStartDate(item.start_date || "2026-05-01");
    setEditEndDate(item.end_date || "2026-12-01");
    setSelectedSaving(null);
  };

  const saveEditSaving = async () => {
    if (!editingId) return;

    const payload = {
      name: editName || "Ahorro sin nombre",
      goal: Number(editGoal),
      start_date: editStartDate,
      end_date: editEndDate,
      monthly_amount: Number(editMonthly),
      contributed: Number(editContributed || 0),
      borrowed: editBorrowed,
    };

    await supabase.from("savings").update(payload).eq("id", editingId);

    await loadSavings();
    resetEditForm();
  };

  const deleteSaving = async (item: any) => {
    const executeDelete = async () => {
      await supabase.from("savings").delete().eq("id", item.id);
      await loadSavings();

      if (selectedSaving?.id === item.id) {
        setSelectedSaving(null);
      }

      if (editingId === item.id) {
        resetEditForm();
      }
    };

    if (Platform.OS === "web") {
      const confirmed = window.confirm(`¿Eliminar el ahorro "${item.name}"?`);

      if (confirmed) {
        await executeDelete();
      }

      return;
    }

    Alert.alert("Eliminar ahorro", `¿Eliminar "${item.name}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: executeDelete,
      },
    ]);
  };

  const renderDateInput = (
    value: string,
    onChange: (value: string) => void,
    placeholder: string,
  ) => {
    if (Platform.OS === "web") {
      return (
        <input
          type="date"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          style={styles.webDate}
        />
      );
    }

    return (
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
      />
    );
  };

  const renderResultBox = (
    startDateValue: string,
    endDateValue: string,
    monthlyValue: string,
    contributedValue: string,
    goalValue: string,
  ) => {
    const result = calculateSaving(
      startDateValue,
      endDateValue,
      Number(monthlyValue || 0),
      Number(contributedValue || 0),
      Number(goalValue || 0),
    );

    return (
      <View style={styles.resultBox}>
        <View style={styles.resultRow}>
          <Text style={styles.resultLabel}>Objetivo</Text>
          <Text style={styles.resultValue}>{result.objetivo.toFixed(2)} €</Text>
        </View>

        <View style={styles.resultRow}>
          <Text style={styles.resultLabel}>Ahorro actual</Text>
          <Text style={styles.resultValue}>
            {result.ahorradoActual.toFixed(2)} €
          </Text>
        </View>

        <View style={styles.resultRow}>
          <Text style={styles.resultLabel}>Pendiente</Text>
          <Text style={styles.resultValue}>
            {result.pendiente.toFixed(2)} €
          </Text>
        </View>

        <View style={styles.resultRow}>
          <Text style={styles.resultLabel}>Meses restantes</Text>
          <Text style={styles.resultValue}>{result.remainingMonths}</Text>
        </View>

        <View style={styles.resultRow}>
          <Text style={styles.resultLabel}>Necesario mensual</Text>
          <Text style={styles.resultValue}>
            {result.ahorroMensual.toFixed(2)} €
          </Text>
        </View>

        <View style={styles.resultRow}>
          <Text style={styles.resultLabel}>Estado</Text>
          <Text
            style={[
              styles.resultValue,
              result.completed ? styles.successText : styles.pendingText,
            ]}
          >
            {result.completed ? "Cumplido" : "En progreso"}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <Header title="Ahorro" />

      <Pressable
        style={styles.settingsButton}
        onPress={() => router.push("/settings")}
      >
        <Text style={styles.settingsButtonText}>☰</Text>
      </Pressable>

      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <View style={styles.headerCard}>
            <View>
              <Text style={styles.headerTitle}>Ahorros</Text>
              <Text style={styles.headerSubtitle}>
                Objetivos y planificación
              </Text>
            </View>

            <Pressable
              style={styles.addButton}
              onPress={() => {
                resetCreateForm();
                resetEditForm();
                setShowCreateForm(!showCreateForm);
              }}
            >
              <Text style={styles.addButtonText}>
                {showCreateForm ? "Cerrar" : "+ Nuevo"}
              </Text>
            </Pressable>
          </View>

          {showCreateForm && (
            <View style={styles.card}>
              <Text style={styles.title}>Nuevo ahorro</Text>
              <Text style={styles.subtitle}>Crea un objetivo nuevo</Text>

              <View style={styles.formBox}>
                <TextInput
                  placeholder="Nombre del ahorro"
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                />

                <TextInput
                  placeholder="Objetivo (€)"
                  style={styles.input}
                  keyboardType="numeric"
                  value={goal}
                  onChangeText={setGoal}
                />

                {renderDateInput(startDate, setStartDate, "Fecha inicio")}
                {renderDateInput(endDate, setEndDate, "Fecha fin")}

                <TextInput
                  placeholder="Ahorro mensual (€)"
                  style={styles.input}
                  keyboardType="numeric"
                  value={monthly}
                  onChangeText={setMonthly}
                />

                <TextInput
                  placeholder="Aportado (€)"
                  style={styles.input}
                  keyboardType="numeric"
                  value={contributed}
                  onChangeText={setContributed}
                />

                <TextInput
                  placeholder="Prestado"
                  style={styles.input}
                  value={borrowed}
                  onChangeText={setBorrowed}
                />

                <Pressable style={styles.primaryButton} onPress={saveNewSaving}>
                  <Text style={styles.primaryButtonText}>Guardar ahorro</Text>
                </Pressable>

                <Pressable
                  style={styles.secondaryButton}
                  onPress={() => {
                    resetCreateForm();
                    setShowCreateForm(false);
                  }}
                >
                  <Text style={styles.secondaryButtonText}>Cancelar</Text>
                </Pressable>
              </View>

              {renderResultBox(startDate, endDate, monthly, contributed, goal)}
            </View>
          )}

          {selectedSaving && (
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View>
                  <Text style={styles.title}>{selectedSaving.name}</Text>
                  <Text style={styles.subtitle}>Detalle del ahorro</Text>
                </View>

                <Pressable
                  style={styles.secondaryButtonSmall}
                  onPress={() => setSelectedSaving(null)}
                >
                  <Text style={styles.secondaryButtonText}>Cerrar</Text>
                </Pressable>
              </View>

              {renderResultBox(
                selectedSaving.start_date,
                selectedSaving.end_date,
                String(selectedSaving.monthly_amount),
                String(selectedSaving.contributed),
                String(selectedSaving.goal),
              )}
            </View>
          )}

          {savings.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No tienes ahorros todavía</Text>
            </View>
          ) : (
            savings.map((item) => {
              const result = calculateSaving(
                item.start_date,
                item.end_date,
                Number(item.monthly_amount),
                Number(item.contributed),
                Number(item.goal),
              );

              const isEditing = editingId === item.id;

              return (
                <View key={item.id} style={styles.savingRow}>
                  {!isEditing ? (
                    <>
                      <View style={styles.savingTopRow}>
                        <View style={styles.savingInfo}>
                          <Text style={styles.savingName}>{item.name}</Text>
                          <Text style={styles.savingMeta}>
                            {item.start_date} → {item.end_date}
                          </Text>
                        </View>

                        <Text style={styles.savingAmount}>
                          {result.ahorradoActual.toFixed(0)} €
                        </Text>
                      </View>

                      <View style={styles.progressBackground}>
                        <View
                          style={[
                            styles.progressFill,
                            {
                              width: `${Math.min(
                                100,
                                Math.max(
                                  0,
                                  (result.ahorradoActual / Number(item.goal)) *
                                    100,
                                ),
                              )}%`,
                            },
                          ]}
                        />
                      </View>

                      <View style={styles.savingSummary}>
                        <Text style={styles.infoText}>
                          Objetivo: {Number(item.goal).toFixed(0)} €
                        </Text>
                        <Text style={styles.infoText}>
                          Pendiente: {result.pendiente.toFixed(0)} €
                        </Text>
                        <Text style={styles.infoText}>
                          Mensual: {Number(item.monthly_amount).toFixed(0)} €
                        </Text>
                      </View>

                      <View style={styles.actionsRowRight}>
                        <Pressable
                          style={styles.iconButton}
                          onPress={() => {
                            setSelectedSaving(item);
                            resetEditForm();
                          }}
                        >
                          <Text style={styles.icon}>👁</Text>
                        </Pressable>

                        <Pressable
                          style={styles.iconButton}
                          onPress={() => startEditSaving(item)}
                        >
                          <Text style={styles.icon}>✏️</Text>
                        </Pressable>

                        <Pressable
                          style={styles.deleteButton}
                          onPress={() => deleteSaving(item)}
                        >
                          <Text style={styles.icon}>🗑</Text>
                        </Pressable>
                      </View>
                    </>
                  ) : (
                    <>
                      <View style={styles.cardHeaderRow}>
                        <View>
                          <Text style={styles.title}>
                            Editando: {item.name}
                          </Text>
                          <Text style={styles.subtitle}>
                            Cambios solo en este ahorro
                          </Text>
                        </View>

                        <Pressable
                          style={styles.secondaryButtonSmall}
                          onPress={resetEditForm}
                        >
                          <Text style={styles.secondaryButtonText}>
                            Cancelar
                          </Text>
                        </Pressable>
                      </View>

                      <View style={styles.formBox}>
                        <TextInput
                          placeholder="Nombre del ahorro"
                          style={styles.input}
                          value={editName}
                          onChangeText={setEditName}
                        />

                        <TextInput
                          placeholder="Objetivo (€)"
                          style={styles.input}
                          keyboardType="numeric"
                          value={editGoal}
                          onChangeText={setEditGoal}
                        />

                        {renderDateInput(
                          editStartDate,
                          setEditStartDate,
                          "Fecha inicio",
                        )}

                        {renderDateInput(
                          editEndDate,
                          setEditEndDate,
                          "Fecha fin",
                        )}

                        <TextInput
                          placeholder="Ahorro mensual (€)"
                          style={styles.input}
                          keyboardType="numeric"
                          value={editMonthly}
                          onChangeText={setEditMonthly}
                        />

                        <TextInput
                          placeholder="Aportado (€)"
                          style={styles.input}
                          keyboardType="numeric"
                          value={editContributed}
                          onChangeText={setEditContributed}
                        />

                        <TextInput
                          placeholder="Prestado"
                          style={styles.input}
                          value={editBorrowed}
                          onChangeText={setEditBorrowed}
                        />

                        <Pressable
                          style={styles.primaryButton}
                          onPress={saveEditSaving}
                        >
                          <Text style={styles.primaryButtonText}>
                            Guardar cambios
                          </Text>
                        </Pressable>

                        <Pressable
                          style={styles.secondaryButton}
                          onPress={resetEditForm}
                        >
                          <Text style={styles.secondaryButtonText}>
                            Cancelar
                          </Text>
                        </Pressable>
                      </View>

                      {renderResultBox(
                        editStartDate,
                        editEndDate,
                        editMonthly,
                        editContributed,
                        editGoal,
                      )}
                    </>
                  )}
                </View>
              );
            })
          )}

          <Pressable
            style={styles.homeButton}
            onPress={() => router.push("/HomePurchase")}
          >
            <Text style={styles.homeButtonText}>Simulador de casa</Text>
          </Pressable>
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
    padding: isWeb ? 28 : 14,
    paddingBottom: 42,
    alignItems: "center",
  },

  content: {
    width: "100%",
    maxWidth: 940,
  },

  headerCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: isWeb ? 18 : 15,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  headerTitle: {
    fontSize: isWeb ? 24 : 20,
    fontWeight: "900",
    color: colors.text,
  },

  headerSubtitle: {
    fontSize: isWeb ? 14 : 12,
    color: colors.mutedText,
    marginTop: 4,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: isWeb ? 16 : 13,
    marginBottom: 16,
  },

  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },

  title: {
    fontSize: isWeb ? 18 : 16,
    fontWeight: "900",
    color: colors.text,
  },

  subtitle: {
    fontSize: isWeb ? 13 : 11,
    color: colors.mutedText,
    marginTop: 3,
  },

  formBox: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    marginBottom: 12,
  },

  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: isWeb ? 11 : 9,
    marginBottom: 8,
    fontSize: isWeb ? 14 : 12,
    color: colors.text,
  },

  webDate: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: isWeb ? 11 : 9,
    marginBottom: 8,
    fontSize: isWeb ? 14 : 12,
    color: colors.text,
  },

  resultBox: {
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    overflow: "hidden",
  },

  resultRow: {
    paddingVertical: isWeb ? 11 : 9,
    paddingHorizontal: isWeb ? 14 : 12,
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },

  resultLabel: {
    fontSize: isWeb ? 13 : 11,
    color: colors.mutedText,
    fontWeight: "800",
  },

  resultValue: {
    fontSize: isWeb ? 13 : 11,
    color: colors.text,
    fontWeight: "900",
  },

  successText: {
    color: colors.success,
  },

  pendingText: {
    color: colors.warning,
  },

  addButton: {
    backgroundColor: colors.primarySoft,
    paddingVertical: isWeb ? 10 : 8,
    paddingHorizontal: isWeb ? 14 : 12,
    borderRadius: 10,
  },

  addButtonText: {
    color: colors.primaryDark,
    fontSize: isWeb ? 14 : 12,
    fontWeight: "900",
  },

  primaryButton: {
    backgroundColor: colors.primaryDark,
    padding: isWeb ? 12 : 10,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 4,
  },

  primaryButtonText: {
    color: colors.white,
    fontWeight: "900",
    fontSize: isWeb ? 14 : 12,
  },

  secondaryButton: {
    backgroundColor: colors.primarySoft,
    padding: isWeb ? 11 : 9,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },

  secondaryButtonSmall: {
    backgroundColor: colors.primarySoft,
    paddingVertical: isWeb ? 8 : 7,
    paddingHorizontal: isWeb ? 12 : 10,
    borderRadius: 10,
  },

  secondaryButtonText: {
    color: colors.primaryDark,
    fontWeight: "900",
    fontSize: isWeb ? 13 : 11,
  },

  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 16,
  },

  emptyText: {
    color: colors.mutedText,
    fontSize: isWeb ? 14 : 12,
  },

  savingRow: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: isWeb ? 16 : 13,
    marginBottom: 14,
  },

  savingTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },

  savingInfo: {
    flex: 1,
  },

  savingName: {
    fontSize: isWeb ? 17 : 15,
    fontWeight: "800",
    color: colors.text,
  },

  savingMeta: {
    fontSize: isWeb ? 12 : 10,
    color: colors.mutedText,
    marginTop: 3,
  },

  savingAmount: {
    fontSize: isWeb ? 20 : 17,
    fontWeight: "900",
    color: colors.primaryDark,
  },

  progressBackground: {
    height: 8,
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    overflow: "hidden",
    marginTop: 12,
  },

  progressFill: {
    height: "100%",
    backgroundColor: colors.primaryDark,
    borderRadius: 999,
  },

  savingSummary: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },

  infoText: {
    fontSize: isWeb ? 12 : 10,
    color: colors.mutedText,
    fontWeight: "700",
  },

  actionsRowRight: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 6,
  },

  iconButton: {
    width: isWeb ? 30 : 28,
    height: isWeb ? 30 : 28,
    borderRadius: 8,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },

  deleteButton: {
    width: isWeb ? 30 : 28,
    height: isWeb ? 30 : 28,
    borderRadius: 8,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
  },

  icon: {
    fontSize: isWeb ? 12 : 10,
  },

  homeButton: {
    backgroundColor: colors.primaryDark,
    padding: isWeb ? 13 : 11,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 18,
  },

  homeButtonText: {
    color: colors.white,
    fontWeight: "900",
    fontSize: isWeb ? 14 : 12,
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
    lineHeight: 24,
    color: colors.text,
    fontWeight: "900",
  },
});
