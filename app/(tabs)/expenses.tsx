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

export default function SavingsScreen() {
  const [showSimulator, setShowSimulator] = useState(false);
  const [savings, setSavings] = useState<any[]>([]);

  const [goal, setGoal] = useState("");
  const [monthly, setMonthly] = useState("");
  const [contributed, setContributed] = useState("");
  const [borrowed, setBorrowed] = useState("");

  const [startDate, setStartDate] = useState("2026-05-01");
  const [endDate, setEndDate] = useState("2026-12-01");

  // -------------------------
  // CALCULOS
  // -------------------------

  const monthsBetween = () => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const months =
      (end.getFullYear() - start.getFullYear()) * 12 +
      (end.getMonth() - start.getMonth());

    return months > 0 ? months : 0;
  };

  const months = monthsBetween();

  const shouldHave = months * Number(monthly || 0) + Number(contributed || 0);

  const remaining = Number(goal || 0) - shouldHave;

  // -------------------------
  // SUPABASE
  // -------------------------

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

  useEffect(() => {
    loadSavings();
  }, []);

  const saveSaving = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { error } = await supabase.from("savings").insert([
      {
        user_id: user.id,
        name: `Ahorro ${goal || "sin objetivo"}`,
        goal: Number(goal),
        start_date: startDate,
        end_date: endDate,
        monthly_amount: Number(monthly),
        contributed: Number(contributed),
        borrowed,
      },
    ]);

    if (error) {
      console.log("ERROR:", error);
    } else {
      loadSavings();
      setShowSimulator(false);
    }
  };

  // -------------------------
  // UI
  // -------------------------

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* BOTON SIMULADOR */}
      <Pressable
        style={styles.expandButton}
        onPress={() => setShowSimulator(!showSimulator)}
      >
        <Text style={styles.expandText}>
          {showSimulator ? "Cerrar simulador" : "+ Simular ahorro"}
        </Text>
      </Pressable>

      {/* SIMULADOR */}
      {showSimulator && (
        <View style={styles.card}>
          <Text style={styles.title}>Simulador de ahorro</Text>

          <TextInput
            placeholder="Objetivo (€)"
            style={styles.input}
            keyboardType="numeric"
            value={goal}
            onChangeText={setGoal}
          />

          <TextInput
            placeholder="Fecha inicio (YYYY-MM-DD)"
            style={styles.input}
            value={startDate}
            onChangeText={setStartDate}
          />

          <TextInput
            placeholder="Fecha fin (YYYY-MM-DD)"
            style={styles.input}
            value={endDate}
            onChangeText={setEndDate}
          />

          <TextInput
            placeholder="Importe mensual (€)"
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
            placeholder="Prestado (texto)"
            style={styles.input}
            value={borrowed}
            onChangeText={setBorrowed}
          />

          {/* RESULTADOS */}
          <View style={styles.resultBox}>
            <Text>Meses: {months}</Text>
            <Text>Deberías tener: {shouldHave.toFixed(2)} €</Text>
            <Text>Objetivo: {goal || 0} €</Text>

            {remaining > 0 ? (
              <Text style={styles.red}>Te faltan {remaining.toFixed(2)} €</Text>
            ) : (
              <Text style={styles.green}>✔ Objetivo cumplido</Text>
            )}
          </View>

          <Pressable style={styles.button} onPress={saveSaving}>
            <Text style={styles.buttonText}>Guardar ahorro</Text>
          </Pressable>
        </View>
      )}

      {/* LISTA */}
      <Text style={styles.sectionTitle}>Tus ahorros</Text>

      {savings.length === 0 ? (
        <Text style={styles.emptyText}>No tienes ahorros todavía</Text>
      ) : (
        savings.map((item) => {
          const months =
            (new Date(item.end_date).getFullYear() -
              new Date(item.start_date).getFullYear()) *
              12 +
            (new Date(item.end_date).getMonth() -
              new Date(item.start_date).getMonth());

          const shouldHave = months * item.monthly_amount + item.contributed;

          const remaining = item.goal - shouldHave;

          return (
            <View key={item.id} style={styles.card}>
              <Text style={styles.savingTitle}>{item.name}</Text>

              <Text style={styles.savingInfo}>
                {item.monthly_amount}€/mes · {months} meses
              </Text>

              <Text style={styles.savingInfo}>
                Deberías tener: {shouldHave.toFixed(2)} €
              </Text>

              {remaining > 0 ? (
                <Text style={styles.red}>Faltan {remaining.toFixed(2)} €</Text>
              ) : (
                <Text style={styles.green}>✔ Completado</Text>
              )}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

// -------------------------
// ESTILOS
// -------------------------

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#F4F7FA",
  },

  expandButton: {
    backgroundColor: "#2563EB",
    padding: 14,
    borderRadius: 10,
    marginBottom: 15,
  },

  expandText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "600",
  },

  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 14,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },

  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10,
  },

  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
  },

  resultBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
  },

  button: {
    backgroundColor: "#16A34A",
    padding: 14,
    borderRadius: 10,
    marginTop: 12,
    alignItems: "center",
  },

  buttonText: {
    color: "#fff",
    fontWeight: "700",
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
  },

  savingTitle: {
    fontSize: 16,
    fontWeight: "700",
  },

  savingInfo: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },

  emptyText: {
    color: "#6B7280",
  },

  red: {
    color: "#DC2626",
    fontWeight: "600",
    marginTop: 4,
  },

  green: {
    color: "#16A34A",
    fontWeight: "600",
    marginTop: 4,
  },
});
