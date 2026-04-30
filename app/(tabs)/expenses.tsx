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
  // -------------------------
  // ESTADOS
  // -------------------------

  const getCurrentMonth = () => {
    const now = new Date();
    return now.toISOString().slice(0, 7);
  };

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());

  const [salary, setSalary] = useState(0);
  const [salaryInput, setSalaryInput] = useState("");

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

  useEffect(() => {
    loadExpenses();
    loadFixedExpenses();
  }, [selectedMonth]);

  // -------------------------
  // GUARDAR SUELDO
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

    setSalary(value);
    setSalaryInput("");
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
    loadFixedExpenses();
  };

  const updateAmount = async (id: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const value = editingValues[id];
    if (!value) return;

    await supabase
      .from("fixed_expenses")
      .update({ amount: Number(value) })
      .eq("id", id)
      .eq("user_id", user?.id);

    setEditingValues((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });

    loadFixedExpenses();
  };

  const togglePaid = async (item: any) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase
      .from("fixed_expenses")
      .update({ is_paid: !item.is_paid })
      .eq("id", item.id)
      .eq("user_id", user?.id);

    loadFixedExpenses();
  };

  const deleteFixed = async (id: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase
      .from("fixed_expenses")
      .delete()
      .eq("id", id)
      .eq("user_id", user?.id);

    loadFixedExpenses();
  };

  const generateFixedForMonth = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: templates } = await supabase
      .from("fixed_templates")
      .select("*")
      .eq("user_id", user?.id);

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
  // 🔥 ESTE ES EL ARREGLO CLAVE
  useEffect(() => {
    const init = async () => {
      setFixedExpenses([]);
      setExpenses([]);

      await generateFixedForMonth(); // 1º crear
      await loadFixedExpenses(); // 2º cargar
      await loadExpenses(); // 3º cargar
    };

    init();
  }, [selectedMonth]);

  useEffect(() => {
    generateFixedForMonth();
  }, [selectedMonth]);
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
      <Text>Sueldo actual : {salary} €</Text>

      <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
        <TextInput
          style={[styles.inlineInput, { flexDirection: "row", width: 100 }]}
          placeholder="Nuevo sueldo"
          keyboardType="numeric"
          value={salaryInput}
          onChangeText={setSalaryInput}
        />
        <Pressable onPress={saveSalary} style={styles.saveButton}>
          <Text style={styles.smallText}>Guardar</Text>
        </Pressable>
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

          <View style={{ flexDirection: "row", gap: 6 }}>
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
              style={styles.saveButton}
            >
              <Text style={styles.smallText}>💾</Text>
            </Pressable>

            <Pressable
              onPress={() => togglePaid(item)}
              style={[
                styles.payButton,
                { backgroundColor: item.is_paid ? "#6B7280" : "#16A34A" },
              ]}
            >
              <Text style={styles.smallText}>{item.is_paid ? "↺" : "✔"}</Text>
            </Pressable>

            <Pressable
              onPress={() => deleteFixed(item.id)}
              style={styles.deleteButton}
            >
              <Text style={styles.smallText}>🗑</Text>
            </Pressable>
          </View>
        </View>
      ))}

      {/* AÑADIR FIJO */}
      <Text style={styles.sectionTitle}>Añadir fijo</Text>

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
        <Text style={styles.buttonText}>Añadir fijo</Text>
      </Pressable>

      {/* VARIABLES */}
      <Text style={styles.title}>Gastos</Text>

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

      <Text style={styles.total}>Total: {totalExpenses} €</Text>

      {expenses.map((item: any) => (
        <View key={item.id} style={styles.expenseItem}>
          <Text>{item.title}</Text>
          <Text style={styles.expenseAmount}>{item.amount} €</Text>
        </View>
      ))}
    </ScrollView>
  );
}

// -------------------------
const styles = StyleSheet.create({
  container: { padding: 24, backgroundColor: "#F4F7FA" },
  title: { fontSize: 28, fontWeight: "800", marginTop: 30 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    flexDirection: "column",
    width: "50%",
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
  expenseAmount: { color: "#DC2626", fontWeight: "700" },
  paidText: {
    color: "#9CA3AF",
    textDecorationLine: "line-through",
  },
  payButton: { padding: 6, borderRadius: 6 },
  saveButton: { backgroundColor: "#2563EB", padding: 6, borderRadius: 6 },
  deleteButton: { backgroundColor: "#DC2626", padding: 6, borderRadius: 6 },
  smallText: { color: "#fff", fontSize: 12 },
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
