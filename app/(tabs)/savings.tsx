import { supabase } from "@/src/lib/supabase";
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
  const [showSimulator, setShowSimulator] = useState(false);
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

  // -------------------------
  // CÁLCULOS
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

    const { data, error } = await supabase
      .from("savings")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) console.log("ERROR LOAD:", error.message);
    setSavings(data || []);
  };

  const saveSaving = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      user_id: user.id,
      name: name || "Ahorro sin nombre",
      goal: Number(goal),
      start_date: startDate,
      end_date: endDate,
      monthly_amount: Number(monthly),
      contributed: Number(contributed),
      borrowed,
    };

    let error;

    if (editingId) {
      const res = await supabase
        .from("savings")
        .update(payload)
        .eq("id", editingId);
      error = res.error;
    } else {
      const res = await supabase.from("savings").insert([payload]);
      error = res.error;
    }

    if (error) {
      console.log("ERROR GUARDAR:", error.message);
      Alert.alert("Error", "No se ha podido guardar el ahorro.");
      return;
    }

    await loadSavings();
    resetForm();
    setShowSimulator(false);
  };

  const deleteSaving = (id: string) => {
    Alert.alert("¿Eliminar ahorro?", "Esta acción no se puede deshacer.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase
            .from("savings")
            .delete()
            .eq("id", id);
          if (error) {
            console.log("ERROR DELETE:", error.message);
            Alert.alert("Error", "No se ha podido eliminar el ahorro.");
          } else {
            if (selectedSaving?.id === id) setSelectedSaving(null);
            loadSavings();
          }
        },
      },
    ]);
  };

  const editSaving = (item: any) => {
    setEditingId(item.id);
    setName(item.name);
    setGoal(String(item.goal));
    setMonthly(String(item.monthly_amount));
    setContributed(String(item.contributed));
    setBorrowed(item.borrowed || "");
    setStartDate(item.start_date);
    setEndDate(item.end_date);
    setShowSimulator(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setGoal("");
    setMonthly("");
    setContributed("");
    setBorrowed("");
    setStartDate("2026-05-01");
    setEndDate("2026-12-01");
  };

  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (_, session) => {
        if (session?.user) loadSavings();
      },
    );

    return () => subscription.subscription.unsubscribe();
  }, []);

  // -------------------------
  // UI
  // -------------------------

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* DETALLE EN PANTALLA COMPLETA */}
      {selectedSaving && (
        <View style={styles.detailCard}>
          <Text style={styles.detailTitle}>{selectedSaving.name}</Text>

          <Text>Objetivo: {selectedSaving.goal} €</Text>
          <Text>Ahorro mensual: {selectedSaving.monthly_amount} €</Text>
          <Text>Aportado: {selectedSaving.contributed} €</Text>
          <Text>Prestado: {selectedSaving.borrowed}</Text>
          <Text>Inicio: {selectedSaving.start_date}</Text>
          <Text>Fin: {selectedSaving.end_date}</Text>

          <View style={{ marginTop: 16 }}>
            <Text style={{ fontWeight: "600" }}>Simulación actual</Text>
            <Text>Meses: {months}</Text>
            <Text>Deberías tener: {shouldHave.toFixed(2)} €</Text>
            <Text>Objetivo: {goal || selectedSaving.goal} €</Text>
            {remaining > 0 ? (
              <Text style={styles.red}>Te faltan {remaining.toFixed(2)} €</Text>
            ) : (
              <Text style={styles.green}>✔ Objetivo cumplido</Text>
            )}
          </View>

          <View style={{ flexDirection: "row", gap: 10, marginTop: 20 }}>
            <Pressable
              style={[styles.button, { backgroundColor: "#2563EB" }]}
              onPress={() => {
                editSaving(selectedSaving);
                setSelectedSaving(null);
              }}
            >
              <Text style={styles.buttonText}>✏️ Editar</Text>
            </Pressable>

            <Pressable
              style={[styles.button, { backgroundColor: "#DC2626" }]}
              onPress={() => deleteSaving(selectedSaving.id)}
            >
              <Text style={styles.buttonText}>🗑 Eliminar</Text>
            </Pressable>

            <Pressable
              style={[styles.button, { backgroundColor: "#6B7280" }]}
              onPress={() => setSelectedSaving(null)}
            >
              <Text style={styles.buttonText}>Cerrar</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* BOTÓN SIMULADOR */}
      <Pressable
        style={styles.expandButton}
        onPress={() => {
          resetForm();
          setShowSimulator(!showSimulator);
        }}
      >
        <Text style={styles.expandText}>
          {showSimulator ? "Cerrar simulador" : "+ Simular ahorro"}
        </Text>
      </Pressable>

      {/* SIMULADOR */}
      {showSimulator && (
        <View style={styles.card}>
          <Text style={styles.title}>
            {editingId ? "Editar ahorro" : "Simulador de ahorro"}
          </Text>

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

          {Platform.OS === "web" ? (
            <>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={styles.webDate}
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={styles.webDate}
              />
            </>
          ) : (
            <>
              <TextInput
                style={styles.input}
                value={startDate}
                onChangeText={setStartDate}
                placeholder="YYYY-MM-DD"
              />
              <TextInput
                style={styles.input}
                value={endDate}
                onChangeText={setEndDate}
                placeholder="YYYY-MM-DD"
              />
            </>
          )}

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
            <Text style={styles.buttonText}>
              {editingId ? "Guardar cambios" : "Guardar ahorro"}
            </Text>
          </Pressable>
        </View>
      )}

      {/* LISTA DE AHORROS */}
      <Text style={styles.sectionTitle}>Tus ahorros</Text>

      {savings.length === 0 ? (
        <Text style={styles.emptyText}>No tienes ahorros todavía</Text>
      ) : (
        <>
          {/* Cabecera */}
          <View style={styles.headerRow}>
            <Text style={[styles.headerText, { flex: 2 }]}>Nombre</Text>
            <Text style={styles.headerText}>Objetivo</Text>
            <Text style={styles.headerText}>Mensual</Text>
            <Text style={styles.headerText}>Pendiente</Text>
            <Text style={styles.headerText}>Estado</Text>
            <Text style={styles.headerText}>Acciones</Text>
          </View>

          {savings.map((item) => {
            // Cálculo de pendiente basado en datos del ahorro
            const start = new Date(item.start_date);
            const end = new Date(item.end_date);
            const now = new Date();

            const totalMonths =
              (end.getFullYear() - start.getFullYear()) * 12 +
              (end.getMonth() - start.getMonth());

            const passedMonths =
              now < start
                ? 0
                : Math.min(
                    totalMonths,
                    (now.getFullYear() - start.getFullYear()) * 12 +
                      (now.getMonth() - start.getMonth()),
                  );

            const expected =
              passedMonths * item.monthly_amount + item.contributed;
            const pending = item.goal - expected;
            const completed = pending <= 0;

            return (
              <View key={item.id} style={styles.savingRow}>
                <Text style={[styles.savingName, { flex: 2 }]}>
                  {item.name}
                </Text>
                <Text style={styles.savingCell}>{item.goal}€</Text>
                <Text style={styles.savingCell}>{item.monthly_amount}€</Text>
                <Text style={styles.savingCell}>
                  {pending > 0 ? pending.toFixed(2) + "€" : "0€"}
                </Text>
                <Text style={styles.savingCell}>{completed ? "✔️" : "⌛"}</Text>

                <View style={styles.actionsRow}>
                  <Pressable
                    style={styles.iconButton}
                    onPress={() => setSelectedSaving(item)}
                  >
                    <Text style={styles.icon}>👁</Text>
                  </Pressable>

                  <Pressable
                    style={styles.iconButton}
                    onPress={() => editSaving(item)}
                  >
                    <Text style={styles.icon}>✏️</Text>
                  </Pressable>

                  <Pressable
                    style={styles.iconButton}
                    onPress={() => deleteSaving(item.id)}
                  >
                    <Text style={styles.icon}>🗑</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </>
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
  },

  detailCard: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 14,
    marginBottom: 20,
  },

  detailTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 10,
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

  webDate: {
    padding: 10,
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
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

  emptyText: {
    color: "#6B7280",
  },

  red: {
    color: "#DC2626",
    fontWeight: "600",
  },

  green: {
    color: "#16A34A",
    fontWeight: "600",
  },

  headerRow: {
    flexDirection: "row",
    marginBottom: 6,
  },

  headerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    color: "#4B5563",
  },

  savingRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
  },

  savingName: {
    fontSize: 14,
    fontWeight: "600",
  },

  savingCell: {
    flex: 1,
    fontSize: 13,
    color: "#374151",
  },

  actionsRow: {
    flexDirection: "row",
    gap: 6,
  },

  iconButton: {
    padding: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 8,
  },

  icon: {
    fontSize: 16,
  },
});
