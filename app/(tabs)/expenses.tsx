import { supabase } from "@/src/lib/supabase";
import { Header } from "@react-navigation/elements";
import { router } from "expo-router";
import { useEffect, useState } from "react";

import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export default function TabTwoScreen() {
  const getCurrentMonth = () => {
    const now = new Date();
    return now.toISOString().slice(0, 7);
  };

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());

  const [salary, setSalary] = useState(0);
  const [salaryInput, setSalaryInput] = useState("");
  const [editingSalary, setEditingSalary] = useState(false);

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [expenses, setExpenses] = useState<any[]>([]);

  const [fixedExpenses, setFixedExpenses] = useState<any[]>([]);
  const [fixedTitle, setFixedTitle] = useState("");
  const [fixedAmount, setFixedAmount] = useState("");
  const [fixedDay, setFixedDay] = useState("");

  const [editingValues, setEditingValues] = useState<{ [key: string]: string }>(
    {},
  );
  const [editingDay, setEditingDay] = useState<{ [key: string]: string }>({});
  const [editingVar, setEditingVar] = useState<{ [key: string]: string }>({});
  const [editingFixedId, setEditingFixedId] = useState<string | null>(null);
  const [editingVarId, setEditingVarId] = useState<string | null>(null);
  const [varDay, setVarDay] = useState("");
  const [editingVarDay, setEditingVarDay] = useState<{ [key: string]: string }>(
    {},
  );

  const [showAddFixed, setShowAddFixed] = useState(false);
  const [showAddVariable, setShowAddVariable] = useState(false);

  // -------------------------
  // LOAD DATA
  // -------------------------

  const loadProfile = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return; // sesión aún no cargada

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    // SI NO EXISTE PERFIL → CREARLO
    if (!data) {
      await supabase.from("profiles").insert({
        id: user.id,
        salary: 0,
      });
      setSalary(0);
      return;
    }

    setSalary(Number(data.salary));
  };

  const updateVariableDay = async (id: string) => {
    const day = editingVarDay[id];
    if (!day) return;

    await supabase
      .from("transactions")
      .update({ day_of_month: Number(day) })
      .eq("id", id);

    loadExpenses();
  };

  const loadExpenses = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user?.id)
      .eq("type", "expense")
      .eq("month", selectedMonth)
      .order("created_at", { ascending: false });

    setExpenses(data || []);
  };

  const loadFixedExpenses = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data } = await supabase
      .from("fixed_expenses")
      .select("*")
      .eq("user_id", user?.id)
      .eq("month", selectedMonth);

    setFixedExpenses(data || []);
  };

  useEffect(() => {
    const checkSession = async () => {
      // Esperar a que Supabase restaure la sesión en Web
      const { data } = await supabase.auth.getSession();

      // Si aún no hay sesión, esperar un poco y volver a intentar
      if (!data.session) {
        setTimeout(checkSession, 200);
        return;
      }

      // Si hay sesión → cargar datos
      loadProfile();
    };

    checkSession();
    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          console.log("SESION LISTA:", session.user.id);
          loadProfile();
          loadFixedExpenses();
          loadExpenses();
        }
      },
    );

    return () => subscription.subscription.unsubscribe();
  }, []);

  // -------------------------
  // GENERAR PLANTILLAS DEL MES
  // -------------------------

  const ensureTemplatesForMonth = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: currentTemplates } = await supabase
      .from("fixed_templates")
      .select("*")
      .eq("user_id", user?.id)
      .eq("month", selectedMonth);

    if (Array.isArray(currentTemplates) && currentTemplates.length > 0) return;

    const prev = new Date(selectedMonth + "-01");
    prev.setMonth(prev.getMonth() - 1);
    const prevMonth = prev.toISOString().slice(0, 7);

    const { data: prevTemplates } = await supabase
      .from("fixed_templates")
      .select("*")
      .eq("user_id", user?.id)
      .eq("month", prevMonth);

    if (!prevTemplates?.length) return;

    const toInsert = prevTemplates.map((t) => ({
      title: t.title,
      amount: t.amount,
      day_of_month: t.day_of_month,
      user_id: user?.id,
      month: selectedMonth,
    }));

    await supabase.from("fixed_templates").insert(toInsert);
  };

  const generateFixedForMonth = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await ensureTemplatesForMonth();

    const { data: templates } = await supabase
      .from("fixed_templates")
      .select("*")
      .eq("user_id", user?.id)
      .eq("month", selectedMonth);

    if (!templates?.length) return;

    const { data: existing } = await supabase
      .from("fixed_expenses")
      .select("title")
      .eq("user_id", user?.id)
      .eq("month", selectedMonth);

    const existingTitles = existing?.map((e) => e.title) || [];

    const toInsert = templates
      .filter((t) => !existingTitles.includes(t.title))
      .map((t) => ({
        title: t.title,
        amount: t.amount,
        day_of_month: t.day_of_month,
        user_id: user?.id,
        month: selectedMonth,
        is_paid: false,
      }));

    if (toInsert.length > 0) {
      await supabase.from("fixed_expenses").insert(toInsert);
    }
  };

  useEffect(() => {
    const init = async () => {
      setFixedExpenses([]);
      setExpenses([]);

      await generateFixedForMonth();
      await loadFixedExpenses();
      await loadExpenses();
    };

    init();
  }, [selectedMonth]);

  // -------------------------
  // SUELDO
  // -------------------------

  const saveSalary = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const value = Number(salaryInput);

    // CORRECCIÓN IMPORTANTE
    if (isNaN(value)) return;

    await supabase.from("profiles").upsert({
      id: user?.id,
      salary: value,
    });

    await loadProfile();
    setEditingSalary(false);
  };

  // -------------------------
  // GASTOS VARIABLES
  // -------------------------

  const handleAddExpense = async () => {
    if (!title || !amount) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase.from("transactions").insert([
      {
        title,
        amount: Number(amount),
        type: "expense",
        user_id: user?.id,
        created_at: new Date().toISOString(),
        month: selectedMonth,
        day_of_month: Number(varDay),
      },
    ]);

    setTitle("");
    setAmount("");
    setVarDay("");
    loadExpenses();
  };

  const updateVariable = async (id: string) => {
    const value = editingVar[id];
    if (!value) return;

    await supabase
      .from("transactions")
      .update({ amount: Number(value) })
      .eq("id", id);

    setEditingVar((prev) => {
      const c = { ...prev };
      delete c[id];
      return c;
    });

    loadExpenses();
  };

  const deleteVariable = async (id: string) => {
    await supabase.from("transactions").delete().eq("id", id);
    loadExpenses();
  };

  // -------------------------
  // GASTOS FIJOS
  // -------------------------

  const handleAddFixedExpense = async () => {
    if (!fixedTitle || !fixedAmount || !fixedDay) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase.from("fixed_templates").insert([
      {
        title: fixedTitle,
        amount: Number(fixedAmount),
        day_of_month: Number(fixedDay),
        user_id: user?.id,
        month: selectedMonth,
      },
    ]);

    setFixedTitle("");
    setFixedAmount("");
    setFixedDay("");

    await generateFixedForMonth();
    loadFixedExpenses();
  };

  const updateAmount = async (id: string) => {
    const value = editingValues[id];
    if (!value) return;

    await supabase
      .from("fixed_expenses")
      .update({ amount: Number(value) })
      .eq("id", id);

    setEditingValues((prev) => {
      const c = { ...prev };
      delete c[id];
      return c;
    });

    loadFixedExpenses();
  };

  const updateDay = async (id: string) => {
    const value = editingDay[id];
    if (!value) return;

    await supabase
      .from("fixed_expenses")
      .update({ day_of_month: Number(value) })
      .eq("id", id);

    setEditingDay((prev) => {
      const c = { ...prev };
      delete c[id];
      return c;
    });

    loadFixedExpenses();
  };
  const updateDayOther = async (id: string) => {
    const value = editingDay[id];
    if (!value) return;

    await supabase
      .from("transactions")
      .update({ day_of_month: Number(value) })
      .eq("id", id);

    setEditingDay((prev) => {
      const c = { ...prev };
      delete c[id];
      return c;
    });

    loadFixedExpenses();
  };
  const togglePaid = async (item: any) => {
    await supabase
      .from("fixed_expenses")
      .update({ is_paid: !item.is_paid })
      .eq("id", item.id);

    loadFixedExpenses();
  };

  const deleteFixed = async (item: any) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase.from("fixed_expenses").delete().eq("id", item.id);

    await supabase
      .from("fixed_templates")
      .delete()
      .eq("title", item.title)
      .eq("user_id", user?.id)
      .eq("month", selectedMonth);

    loadFixedExpenses();
  };

  // -------------------------
  // CALCULOS
  // -------------------------

  const totalFixed = fixedExpenses.reduce(
    (sum, f) => sum + Number(f.amount),
    0,
  );
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const fixedPaidTotal = fixedExpenses
    .filter((f) => f.is_paid)
    .reduce((sum, f) => sum + Number(f.amount), 0);

  const available = salary - fixedPaidTotal - totalExpenses;

  // -------------------------
  // UI
  // -------------------------

  return (
    <View style={{ flex: 1 }}>
      <Header title="Gastos" />
      <Pressable
        style={styles.settingsButton}
        onPress={() => router.push("/settings")}
      >
        <Text style={styles.settingsButtonText}>☰</Text>
      </Pressable>
      <ScrollView contentContainerStyle={styles.container} style={{ flex: 1 }}>
        {/* SELECTOR MES */}
        <View style={styles.monthBar}>
          <Pressable
            onPress={() => {
              const [year, month] = selectedMonth.split("-").map(Number);
              let newYear = year;
              let newMonth = month - 1;

              if (newMonth < 1) {
                newMonth = 12;
                newYear -= 1;
              }

              setSelectedMonth(
                `${newYear}-${String(newMonth).padStart(2, "0")}`,
              );
            }}
          >
            <Text>⬅️</Text>
          </Pressable>

          <Text style={styles.monthText}>{selectedMonth}</Text>

          <Pressable
            onPress={() => {
              const [year, month] = selectedMonth.split("-").map(Number);
              let newYear = year;
              let newMonth = month + 1;

              if (newMonth > 12) {
                newMonth = 1;
                newYear += 1;
              }

              setSelectedMonth(
                `${newYear}-${String(newMonth).padStart(2, "0")}`,
              );
            }}
          >
            <Text>➡️</Text>
          </Pressable>
        </View>

        {/* SUELDO */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          {!editingSalary ? (
            <>
              <Text>Sueldo actual: {salary} €</Text>
              <Pressable
                style={styles.smallButtonBlue}
                onPress={() => {
                  setSalaryInput(String(salary));
                  setEditingSalary(true);
                }}
              >
                <Text style={styles.smallTextWhite}>✏️</Text>
              </Pressable>
            </>
          ) : (
            <>
              <TextInput
                style={[styles.inlineInput, { width: 100 }]}
                value={salaryInput}
                keyboardType="numeric"
                onChangeText={setSalaryInput}
              />
              <Pressable onPress={saveSalary} style={styles.smallButton}>
                <Text style={styles.smallText}>💾</Text>
              </Pressable>
            </>
          )}
        </View>

        {/* RESUMEN */}
        <Text style={styles.sectionInfo}>
          Gastos fijos pagados: {fixedPaidTotal} €
        </Text>
        <Text style={styles.sectionInfo}>Otros Gastos: {totalExpenses} €</Text>
        <Text style={styles.available}>Disponible: {available} €</Text>

        {/* GASTOS FIJOS */}
        <Text style={styles.sectionTitle}>Gastos fijos: {totalFixed} €</Text>
        {/* BOTÓN DESPLEGABLE FIJO */}
        <Pressable
          style={styles.smallButtonBlue}
          onPress={() => setShowAddFixed(!showAddFixed)}
        >
          <Text style={styles.smallTextWhite}>
            {showAddFixed ? "Cerrar" : "Añadir fijo"}
          </Text>
        </Pressable>
        {fixedExpenses.map((item: any) => {
          const isEditing = editingFixedId === item.id;

          return (
            <View style={styles.rowBetween}>
              {/* IZQUIERDA */}
              <Text style={styles.fixedTitle}>{item.title}</Text>

              {/* CENTRO */}
              {!isEditing ? (
                <Text style={styles.middleInfo}>
                  {item.amount}€ · día {item.day_of_month}
                </Text>
              ) : (
                <View style={styles.editInputs}>
                  <TextInput
                    style={styles.inlineInput}
                    value={editingValues[item.id] ?? String(item.amount)}
                    keyboardType="numeric"
                    onChangeText={(v) =>
                      setEditingValues((prev) => ({ ...prev, [item.id]: v }))
                    }
                  />
                  <TextInput
                    style={styles.inlineInput}
                    value={editingDay[item.id] ?? String(item.day_of_month)}
                    keyboardType="numeric"
                    onChangeText={(v) =>
                      setEditingDay((prev) => ({ ...prev, [item.id]: v }))
                    }
                  />
                </View>
              )}

              {/* DERECHA */}
              <View style={styles.actions}>
                {!isEditing ? (
                  <Pressable
                    onPress={() => setEditingFixedId(item.id)}
                    style={styles.smallButton}
                  >
                    <Text style={styles.smallText}>✏️</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={async () => {
                      await updateAmount(item.id);
                      await updateDay(item.id);
                      setEditingFixedId(null);
                    }}
                    style={styles.smallButton}
                  >
                    <Text style={styles.smallText}>💾</Text>
                  </Pressable>
                )}

                <Pressable
                  onPress={() => togglePaid(item)}
                  style={[
                    styles.smallButton,
                    { backgroundColor: item.is_paid ? "#6B7280" : "#16A34A" },
                  ]}
                >
                  <Text style={styles.smallText}>
                    {item.is_paid ? "↺" : "✔"}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => deleteFixed(item)}
                  style={styles.deleteButton}
                >
                  <Text style={styles.smallText}>🗑</Text>
                </Pressable>
              </View>
            </View>
          );
        })}

        {showAddFixed && (
          <>
            <TextInput
              style={styles.input}
              placeholder="Concepto"
              value={fixedTitle}
              onChangeText={setFixedTitle}
            />
            <TextInput
              style={styles.input}
              placeholder="Cantidad"
              value={fixedAmount}
              keyboardType="numeric"
              onChangeText={setFixedAmount}
            />
            <TextInput
              style={styles.input}
              placeholder="Día del mes"
              value={fixedDay}
              keyboardType="numeric"
              onChangeText={setFixedDay}
            />

            <Pressable style={styles.button} onPress={handleAddFixedExpense}>
              <Text style={styles.buttonText}>Guardar fijo</Text>
            </Pressable>
          </>
        )}

        {/* VARIABLES */}
        <Text style={styles.sectionTitle}>Otros Gastos</Text>

        <Pressable
          style={styles.smallButtonBlue}
          onPress={() => setShowAddVariable(!showAddVariable)}
        >
          <Text style={styles.smallTextWhite}>
            {showAddVariable ? "Cerrar" : "Añadir gasto"}
          </Text>
        </Pressable>

        {showAddVariable && (
          <>
            <TextInput
              style={styles.input}
              placeholder="Concepto"
              value={title}
              onChangeText={setTitle}
            />
            <TextInput
              style={styles.input}
              placeholder="Cantidad"
              value={amount}
              keyboardType="numeric"
              onChangeText={setAmount}
            />

            <Pressable style={styles.button} onPress={handleAddExpense}>
              <Text style={styles.buttonText}>Guardar gasto</Text>
            </Pressable>
          </>
        )}

        {expenses.map((item: any) => {
          const isEditing = editingVarId === item.id;

          return (
            <View key={item.id} style={styles.rowBetween}>
              {/* IZQUIERDA */}
              <Text style={styles.fixedTitle}>{item.title}</Text>

              {/* CENTRO */}
              {!isEditing ? (
                <Text style={styles.middleInfo}>
                  {item.amount}€ · día {item.day_of_month}
                </Text>
              ) : (
                <View style={styles.editInputs}>
                  <TextInput
                    style={styles.inlineInput}
                    value={editingVar[item.id] ?? String(item.amount)}
                    keyboardType="numeric"
                    onChangeText={(v) =>
                      setEditingVar((prev) => ({ ...prev, [item.id]: v }))
                    }
                  />

                  <TextInput
                    style={styles.inlineInput}
                    value={editingVarDay[item.id] ?? String(item.day_of_month)}
                    keyboardType="numeric"
                    onChangeText={(v) =>
                      setEditingVarDay((prev) => ({
                        ...prev,
                        [item.id]: v,
                      }))
                    }
                  />
                </View>
              )}

              {/* DERECHA */}
              <View style={styles.actions}>
                {!isEditing ? (
                  <Pressable
                    onPress={() => setEditingVarId(item.id)}
                    style={styles.smallButton}
                  >
                    <Text style={styles.smallText}>✏️</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={async () => {
                      await updateVariable(item.id);
                      await updateVariableDay(item.id);
                      setEditingVarId(null);
                    }}
                    style={styles.smallButton}
                  >
                    <Text style={styles.smallText}>💾</Text>
                  </Pressable>
                )}

                <Pressable
                  onPress={() => deleteVariable(item.id)}
                  style={styles.deleteButton}
                >
                  <Text style={styles.smallText}>🗑</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, backgroundColor: "#F4F7FA" },
  title: { fontSize: 28, fontWeight: "800", marginTop: 30 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 20,
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
  },
  button: {
    backgroundColor: "#16A34A",
    padding: 14,
    borderRadius: 12,
    marginTop: 10,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "700" },
  expenseItem: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  expenseTitle: { fontSize: 16 },
  paidText: {
    color: "#9CA3AF",
    textDecorationLine: "line-through",
  },
  smallButtonBlue: {
    backgroundColor: "#085175",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignSelf: "flex-start",
    fontSize: 10,
  },
  smallText: { color: "#fff", fontSize: 8 },
  smallTextWhite: { color: "#fff", fontSize: 8, fontWeight: "600" },
  total: { fontSize: 20, fontWeight: "800", marginTop: 20 },
  available: {
    fontSize: 18,
    fontWeight: "800",
    marginTop: 10,
    textAlign: "right",
  },
  monthBar: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    marginBottom: 20,
  },
  monthText: { fontSize: 16, fontWeight: "700" },
  fixedRow: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
  },
  fixedTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
  },
  fixedInputs: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  label: {
    fontSize: 14,
  },
  inlineInput: {
    width: 55,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 6,
    padding: 6,
    textAlign: "center",
    backgroundColor: "#fff",
  },
  smallButton: {
    backgroundColor: "#2563EB",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },

  deleteButton: {
    backgroundColor: "#DC2626",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  sectionInfo: {
    fontSize: 14,
    color: "#374151",
    marginTop: 4,
    textAlign: "right",
  },
  rowBetween: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  actions: {
    flexDirection: "row",
    gap: 6,
  },

  subInfo: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  middleInfo: {
    flex: 1,
    textAlign: "right",
    marginRight: 10,
    fontSize: 14,
    color: "#6B7280",
  },

  editInputs: {
    flexDirection: "row",
    gap: 6,
    flex: 1,
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },

  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24, // mismo padding que tu contenido
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
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
});
