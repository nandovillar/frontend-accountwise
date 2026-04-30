import { supabase } from "@/src/lib/supabase";
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

  const [showAddFixed, setShowAddFixed] = useState(false);
  const [showAddVariable, setShowAddVariable] = useState(false);

  // -------------------------
  // LOAD DATA
  // -------------------------

  const loadProfile = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user?.id)
      .single();

    if (data) setSalary(Number(data.salary));
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
    loadProfile();
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

    if (currentTemplates?.length > 0) return;

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
    if (!value) return;

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
      },
    ]);

    setTitle("");
    setAmount("");
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
      .eq("user_id", user.id)
      .eq("month", selectedMonth);

    loadFixedExpenses();
  };

  // -------------------------
  // CALCULOS
  // -------------------------

  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const fixedPaidTotal = fixedExpenses
    .filter((f) => f.is_paid)
    .reduce((sum, f) => sum + Number(f.amount), 0);

  const available = salary - fixedPaidTotal - totalExpenses;

  // -------------------------
  // UI
  // -------------------------

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* SELECTOR MES */}
      <View style={styles.monthBar}>
        <Pressable
          onPress={() => {
            const d = new Date(selectedMonth + "-01");
            d.setMonth(d.getMonth() - 1);
            setSelectedMonth(d.toISOString().slice(0, 7));
          }}
        >
          <Text>⬅️</Text>
        </Pressable>

        <Text style={styles.monthText}>{selectedMonth}</Text>

        <Pressable
          onPress={() => {
            const d = new Date(selectedMonth + "-01");
            d.setMonth(d.getMonth() + 1);
            setSelectedMonth(d.toISOString().slice(0, 7));
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
      <Text>Fijos pagados: {fixedPaidTotal} €</Text>
      <Text>Variables: {totalExpenses} €</Text>
      <Text style={styles.available}>Disponible: {available} €</Text>

      {/* GASTOS FIJOS */}
      <Text style={styles.sectionTitle}>Gastos fijos</Text>

      {fixedExpenses.map((item: any) => (
        <View
          key={item.id}
          style={[
            styles.expenseItem,
            item.is_paid && { backgroundColor: "#E5E7EB" },
          ]}
        >
          <Text style={[styles.expenseTitle, item.is_paid && styles.paidText]}>
            {item.title}
          </Text>

          <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
            <Text>Precio:</Text>
            <TextInput
              style={styles.inlineInput}
              value={editingValues[item.id] ?? String(item.amount)}
              keyboardType="numeric"
              onChangeText={(v) =>
                setEditingValues((prev) => ({ ...prev, [item.id]: v }))
              }
            />
            <Pressable
              onPress={() => updateAmount(item.id)}
              style={styles.smallButton}
            >
              <Text style={styles.smallText}>💾</Text>
            </Pressable>

            <Text>Día:</Text>
            <TextInput
              style={styles.inlineInput}
              value={editingDay[item.id] ?? String(item.day_of_month)}
              keyboardType="numeric"
              onChangeText={(v) =>
                setEditingDay((prev) => ({ ...prev, [item.id]: v }))
              }
            />
            <Pressable
              onPress={() => updateDay(item.id)}
              style={styles.smallButton}
            >
              <Text style={styles.smallText}>📅</Text>
            </Pressable>

            <Pressable
              onPress={() => togglePaid(item)}
              style={[
                styles.smallButton,
                { backgroundColor: item.is_paid ? "#6B7280" : "#16A34A" },
              ]}
            >
              <Text style={styles.smallText}>{item.is_paid ? "↺" : "✔"}</Text>
            </Pressable>

            <Pressable
              onPress={() => deleteFixed(item)}
              style={styles.deleteButton}
            >
              <Text style={styles.smallText}>🗑</Text>
            </Pressable>
          </View>
        </View>
      ))}

      {/* BOTÓN DESPLEGABLE FIJO */}
      <Pressable
        style={styles.smallButtonBlue}
        onPress={() => setShowAddFixed(!showAddFixed)}
      >
        <Text style={styles.smallTextWhite}>
          {showAddFixed ? "Cerrar" : "Añadir fijo"}
        </Text>
      </Pressable>

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
      <Text style={styles.title}>Gastos</Text>

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

      <Text style={styles.total}>Total: {totalExpenses} €</Text>

      {expenses.map((item: any) => (
        <View key={item.id} style={styles.expenseItem}>
          <Text>{item.title}</Text>

          <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
            <TextInput
              style={styles.inlineInput}
              value={editingVar[item.id] ?? String(item.amount)}
              keyboardType="numeric"
              onChangeText={(v) =>
                setEditingVar((prev) => ({ ...prev, [item.id]: v }))
              }
            />

            <Pressable
              onPress={() => updateVariable(item.id)}
              style={styles.smallButton}
            >
              <Text style={styles.smallText}>💾</Text>
            </Pressable>

            <Pressable
              onPress={() => deleteVariable(item.id)}
              style={styles.deleteButton}
            >
              <Text style={styles.smallText}>🗑</Text>
            </Pressable>
          </View>
        </View>
      ))}
    </ScrollView>
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
  inlineInput: {
    width: 60,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 6,
    padding: 4,
    textAlign: "center",
    backgroundColor: "#fff",
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
  deleteButton: {
    backgroundColor: "#DC2626",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  smallButton: {
    backgroundColor: "#2563EB",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  smallButtonBlue: {
    backgroundColor: "#0EA5E9",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  smallText: { color: "#fff", fontSize: 12 },
  smallTextWhite: { color: "#fff", fontSize: 14, fontWeight: "600" },
  total: { fontSize: 20, fontWeight: "800", marginTop: 20 },
  available: { fontSize: 22, fontWeight: "800", marginTop: 10 },
  monthBar: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    marginBottom: 20,
  },
  monthText: { fontSize: 16, fontWeight: "700" },
});
